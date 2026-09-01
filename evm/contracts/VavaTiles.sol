// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * VAVAWORLD on Robinhood Chain (EVM port of anchor/programs/tiles).
 *
 * Economic invariants carried over 1:1 from the Solana program:
 *  - Primary claims are priced ONLY by keeper-signed quotes (EIP-712).
 *    The contract rejects any unquoted price, so pricing can never be
 *    bypassed - same guarantee as the ed25519 gate on Solana.
 *  - Every claim splits 85/15: treasury / buyback escrow. The 15% is
 *    tracked per hex as pendingWei until the keeper embeds $VAVA.
 *  - embed() is atomic per hex: VAVA into the vault + hex credited +
 *    keeper reimbursed its escrowed wei in one call.
 *  - raze() burns the hex and pays out embedded VAVA minus a 10%
 *    haircut, which is burned (sent to 0xdead).
 *  - Staking locks VAVA in the contract with a 24h unstake cooldown
 *    that RESETS for the whole pending amount on each beginUnstake.
 *  - Bids escrow ETH in the contract; accept splits 95/5 (or 97/3 for
 *    baron-tier sellers) and flips the hex atomically.
 *
 * EVM-specific wins vs Solana: one transaction claims up to 1000 hexes,
 * and listing sales settle atomically on-chain (no sync_owner keeper).
 */

import {IERC20} from "./interfaces/IERC20.sol";

contract VavaTiles {
    // ---------------------------------------------------------------- types

    struct Hex {
        address owner;
        uint64 pricePaidWei6; // price paid, in wei / 1e6 (fits u64 for ~18M ETH)
        uint40 claimedAt;
        uint8 tier; // 1..3, from the city bbox table
        uint128 pendingWei; // 15% escrow awaiting embed
        uint128 embeddedVava; // VAVA base units locked in this hex
    }

    struct Stake {
        uint128 amount;
        uint128 pendingAmount;
        uint40 availableAt;
    }

    struct Bid {
        address bidder;
        uint128 amountWei;
    }

    // ---------------------------------------------------------------- state

    address public admin;
    address public keeper; // signs quotes + runs embed
    address public immutable treasury;
    IERC20 public vava;
    bool public mintLocked;

    mapping(uint64 => Hex) public hexes; // h3 index -> hex
    mapping(address => Stake) public stakes;
    mapping(uint64 => Bid) public bids; // one active bid per hex
    mapping(uint64 => uint128) public listings; // askWei; 0 = not listed

    uint256 public totalPendingWei; // sum of all hex escrows (sanity/accounting)
    uint64[3] public tierCounts;

    // ---------------------------------------------------------------- config

    uint16 public constant TREASURY_BPS = 8500;
    uint16 public constant EMBED_BPS = 1500;
    uint16 public constant SECONDARY_FEE_BPS = 500; // standard seller fee
    uint16 public constant SECONDARY_FEE_BARON_BPS = 300;
    uint16 public constant RAZE_HAIRCUT_BPS = 1000;
    uint32 public constant UNSTAKE_DELAY = 86400;
    uint128 public constant BARON_THRESHOLD = 500_000e6; // whole VAVA, 6 decimals

    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    // ---------------------------------------------------------------- EIP-712

    // keccak256("VavaClaim(address claimer,uint64[] h3s,uint256[] pricesWei,uint256 expiry)")
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("VavaClaim(address claimer,uint64[] h3s,uint256[] pricesWei,uint256 expiry)");
    bytes32 public immutable DOMAIN_SEPARATOR;

    // ---------------------------------------------------------------- events

    event Claimed(address indexed owner, uint64 indexed h3, uint256 priceWei, uint8 tier);
    event Embedded(uint64 indexed h3, uint256 vavaAmount, uint256 reimbursedWei);
    event Razed(uint64 indexed h3, address indexed owner, uint256 vavaPaid, uint256 vavaBurned);
    event Listed(uint64 indexed h3, uint256 askWei);
    event Delisted(uint64 indexed h3);
    event Sold(uint64 indexed h3, address indexed from, address indexed to, uint256 priceWei);
    event BidPlaced(uint64 indexed h3, address indexed bidder, uint256 amountWei);
    event BidResolved(uint64 indexed h3, address indexed bidder, bool accepted);
    event Staked(address indexed who, uint256 amount);
    event UnstakeBegun(address indexed who, uint256 amount, uint256 availableAt);
    event UnstakeWithdrawn(address indexed who, uint256 amount);
    event MintUpdated(address mint);
    event MintLocked();

    // ---------------------------------------------------------------- errors

    error NotAdmin();
    error NotKeeper();
    error NotOwner();
    error QuoteExpired();
    error BadSignature();
    error AlreadyClaimed(uint64 h3);
    error WrongPayment();
    error MintIsLocked();
    error VaultNotEmpty();
    error NothingPending();
    error CooldownActive();
    error NoBid();
    error BidExists();
    error NotListed();
    error LengthMismatch();
    error TooMany();

    // ---------------------------------------------------------------- init

    constructor(address _treasury, address _keeper, address _vava) {
        admin = msg.sender;
        treasury = _treasury;
        keeper = _keeper;
        vava = IERC20(_vava);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("VAVAWORLD")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    // ---------------------------------------------------------------- claim

    /**
     * Claim up to 1000 hexes in ONE transaction. Prices come from the
     * keeper-signed quote; msg.value must equal their sum exactly.
     * Tier is provided per hex by the quote too - the keeper classifies
     * server-side against the same city table, and signs the result, so
     * a claimer cannot lie about tiers without breaking the signature.
     */
    function claim(
        uint64[] calldata h3s,
        uint256[] calldata pricesWei,
        uint8[] calldata tiers,
        uint256 expiry,
        bytes calldata signature
    ) external payable {
        uint256 n = h3s.length;
        if (n == 0 || n > 1000) revert TooMany();
        if (pricesWei.length != n || tiers.length != n) revert LengthMismatch();
        if (block.timestamp > expiry) revert QuoteExpired();
        _verifyQuote(msg.sender, h3s, pricesWei, tiers, expiry, signature);

        uint256 total;
        for (uint256 i; i < n; ++i) {
            uint64 id = h3s[i];
            if (hexes[id].owner != address(0)) revert AlreadyClaimed(id);
            uint256 price = pricesWei[i];
            total += price;

            uint128 pending = uint128((price * EMBED_BPS) / 10_000);
            hexes[id] = Hex({
                owner: msg.sender,
                pricePaidWei6: uint64(price / 1e6),
                claimedAt: uint40(block.timestamp),
                tier: tiers[i],
                pendingWei: pending,
                embeddedVava: 0
            });
            totalPendingWei += pending;
            unchecked {
                tierCounts[tiers[i] - 1] += 1;
            }
            emit Claimed(msg.sender, id, price, tiers[i]);
        }

        if (msg.value != total) revert WrongPayment();
        // 85% out to treasury now; the 15% stays in the contract as escrow.
        _pay(treasury, (total * TREASURY_BPS) / 10_000);
    }

    function _verifyQuote(
        address claimer,
        uint64[] calldata h3s,
        uint256[] calldata pricesWei,
        uint8[] calldata tiers,
        uint256 expiry,
        bytes calldata signature
    ) internal view {
        // tiers ride inside the h3 hash: h3s[i] is packed with the tier in
        // the top byte server-side? No - keep it explicit and simple:
        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                claimer,
                keccak256(abi.encodePacked(h3s)),
                keccak256(abi.encodePacked(pricesWei)),
                expiry
            )
        );
        // tiers are committed via a second packed hash appended to the digest
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash, keccak256(abi.encodePacked(tiers)))
        );
        if (_recover(digest, signature) != keeper) revert BadSignature();
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        return ecrecover(digest, v, r, s);
    }

    // ---------------------------------------------------------------- embed / raze

    /** Keeper: lock bought VAVA into hexes, get escrowed ETH back. */
    function embed(uint64[] calldata h3s, uint256[] calldata amounts) external onlyKeeper {
        if (h3s.length != amounts.length) revert LengthMismatch();
        uint256 reimburse;
        uint256 vavaIn;
        for (uint256 i; i < h3s.length; ++i) {
            Hex storage h = hexes[h3s[i]];
            uint128 pending = h.pendingWei;
            if (pending == 0) revert NothingPending();
            h.embeddedVava += uint128(amounts[i]);
            h.pendingWei = 0;
            totalPendingWei -= pending;
            reimburse += pending;
            vavaIn += amounts[i];
            emit Embedded(h3s[i], amounts[i], pending);
        }
        require(vava.transferFrom(msg.sender, address(this), vavaIn), "vava in");
        _pay(msg.sender, reimburse);
    }

    /** Owner: burn the hex, take its embedded VAVA minus the 10% burn. */
    function raze(uint64 h3) external {
        Hex storage h = hexes[h3];
        if (h.owner != msg.sender) revert NotOwner();
        uint256 embedded = h.embeddedVava;
        uint256 pending = h.pendingWei;
        uint8 tier = h.tier;
        delete hexes[h3];
        delete listings[h3];
        // A pending bid on a razed hex is refunded.
        _refundBid(h3);
        if (pending > 0) {
            // escrow that never got embedded goes back to the buyback pool
            // owner: it stays in the contract for the keeper's next pass?
            // No hex to attach it to any more - send it to treasury.
            totalPendingWei -= pending;
            _pay(treasury, pending);
        }
        unchecked {
            tierCounts[tier - 1] -= 1;
        }
        uint256 burned = (embedded * RAZE_HAIRCUT_BPS) / 10_000;
        uint256 payout = embedded - burned;
        if (payout > 0) require(vava.transfer(msg.sender, payout), "vava out");
        if (burned > 0) require(vava.transfer(BURN, burned), "vava burn");
        emit Razed(h3, msg.sender, payout, burned);
    }

    // ---------------------------------------------------------------- market

    function list(uint64 h3, uint128 askWei) external {
        if (hexes[h3].owner != msg.sender) revert NotOwner();
        if (askWei == 0) revert WrongPayment();
        listings[h3] = askWei;
        emit Listed(h3, askWei);
    }

    function delist(uint64 h3) external {
        if (hexes[h3].owner != msg.sender) revert NotOwner();
        delete listings[h3];
        emit Delisted(h3);
    }

    /** Atomic listing purchase - the EVM upgrade over wallet-transfer + sync_owner. */
    function buy(uint64 h3) external payable {
        uint128 ask = listings[h3];
        if (ask == 0) revert NotListed();
        if (msg.value != ask) revert WrongPayment();
        address seller = hexes[h3].owner;
        _settleSale(h3, seller, msg.sender, ask);
        emit Sold(h3, seller, msg.sender, ask);
    }

    function placeBid(uint64 h3) external payable {
        if (hexes[h3].owner == address(0) || hexes[h3].owner == msg.sender) revert NotOwner();
        if (bids[h3].bidder != address(0)) revert BidExists();
        if (msg.value == 0) revert WrongPayment();
        bids[h3] = Bid({bidder: msg.sender, amountWei: uint128(msg.value)});
        emit BidPlaced(h3, msg.sender, msg.value);
    }

    function cancelBid(uint64 h3) external {
        Bid memory b = bids[h3];
        if (b.bidder != msg.sender) revert NoBid();
        delete bids[h3];
        _pay(b.bidder, b.amountWei);
        emit BidResolved(h3, b.bidder, false);
    }

    function declineBid(uint64 h3) external {
        if (hexes[h3].owner != msg.sender) revert NotOwner();
        _refundBid(h3);
    }

    function acceptBid(uint64 h3) external {
        if (hexes[h3].owner != msg.sender) revert NotOwner();
        Bid memory b = bids[h3];
        if (b.bidder == address(0)) revert NoBid();
        delete bids[h3];
        _settleSale(h3, msg.sender, b.bidder, b.amountWei);
        emit BidResolved(h3, b.bidder, true);
        emit Sold(h3, msg.sender, b.bidder, b.amountWei);
    }

    function _settleSale(uint64 h3, address seller, address buyer, uint256 priceWei) internal {
        uint16 feeBps =
            stakes[seller].amount >= BARON_THRESHOLD ? SECONDARY_FEE_BARON_BPS : SECONDARY_FEE_BPS;
        uint256 fee = (priceWei * feeBps) / 10_000;
        hexes[h3].owner = buyer;
        hexes[h3].claimedAt = uint40(block.timestamp);
        delete listings[h3];
        _refundBid(h3); // any open bid from a third party is returned
        _pay(treasury, fee);
        _pay(seller, priceWei - fee);
    }

    function _refundBid(uint64 h3) internal {
        Bid memory b = bids[h3];
        if (b.bidder != address(0)) {
            delete bids[h3];
            _pay(b.bidder, b.amountWei);
            emit BidResolved(h3, b.bidder, false);
        }
    }

    // ---------------------------------------------------------------- staking

    function stake(uint256 amount) external {
        require(amount > 0, "zero");
        require(vava.transferFrom(msg.sender, address(this), amount), "vava in");
        stakes[msg.sender].amount += uint128(amount);
        emit Staked(msg.sender, amount);
    }

    /** Starts/extends the 24h cooldown for the WHOLE pending amount. */
    function beginUnstake(uint256 amount) external {
        Stake storage s = stakes[msg.sender];
        require(amount > 0 && amount <= s.amount, "amount");
        s.amount -= uint128(amount);
        s.pendingAmount += uint128(amount);
        s.availableAt = uint40(block.timestamp + UNSTAKE_DELAY);
        emit UnstakeBegun(msg.sender, amount, s.availableAt);
    }

    function withdrawUnstaked() external {
        Stake storage s = stakes[msg.sender];
        uint256 amount = s.pendingAmount;
        if (amount == 0) revert NothingPending();
        if (block.timestamp < s.availableAt) revert CooldownActive();
        s.pendingAmount = 0;
        s.availableAt = 0;
        require(vava.transfer(msg.sender, amount), "vava out");
        emit UnstakeWithdrawn(msg.sender, amount);
    }

    // ---------------------------------------------------------------- admin

    function updateKeeper(address k) external onlyAdmin {
        keeper = k;
    }

    /** Swap the VAVA token (launch minute). Refuses once locked or while
     *  the contract still holds old-token balances. */
    function updateMint(address newVava) external onlyAdmin {
        if (mintLocked) revert MintIsLocked();
        if (address(vava) != address(0) && vava.balanceOf(address(this)) != 0) revert VaultNotEmpty();
        vava = IERC20(newVava);
        emit MintUpdated(newVava);
    }

    function lockMint() external onlyAdmin {
        mintLocked = true;
        emit MintLocked();
    }

    // ---------------------------------------------------------------- util

    function _pay(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "eth transfer");
    }
}
