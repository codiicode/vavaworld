// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * Minimal Uniswap v4 exact-input buyer for the keeper. The chain has no
 * trusted public v4 router, so the keeper owns this ~60-line one instead:
 * unlock -> swap (exact in, native ETH -> token) -> settle ETH -> take
 * tokens to the keeper. Owner-only so nobody can grief through it.
 */
interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
        external
        returns (int256 delta);
    function settle() external payable returns (uint256);
    function take(address currency, address to, uint256 amount) external;
}

contract VavaV4Swapper {
    IPoolManager public immutable pm;
    address public immutable owner;

    // v4 TickMath bounds; +/-1 = "no price limit" for each direction.
    uint160 private constant MIN_SQRT_PRICE_P1 = 4295128740;
    uint160 private constant MAX_SQRT_PRICE_M1 =
        1461446703485210103287273052203988822378723970341;

    constructor(address poolManager) {
        pm = IPoolManager(poolManager);
        owner = msg.sender;
    }

    /** Buy currency1 with exact `msg.value` native ETH (currency0 = 0x0). */
    function buyExactIn(IPoolManager.PoolKey calldata key, uint256 minOut)
        external
        payable
        returns (uint256 out)
    {
        require(msg.sender == owner, "owner");
        require(key.currency0 == address(0), "native in only");
        bytes memory res = pm.unlock(abi.encode(key, msg.value, minOut, msg.sender));
        out = abi.decode(res, (uint256));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(pm), "pm");
        (IPoolManager.PoolKey memory key, uint256 amountIn, uint256 minOut, address to) =
            abi.decode(data, (IPoolManager.PoolKey, uint256, uint256, address));

        int256 delta = pm.swap(
            key,
            IPoolManager.SwapParams(true, -int256(amountIn), MIN_SQRT_PRICE_P1),
            ""
        );
        // BalanceDelta packs amount0 in the high 128 bits, amount1 in the low.
        int128 a0 = int128(delta >> 128);
        int128 a1 = int128(delta);
        require(a0 <= 0 && a1 >= 0, "unexpected delta");

        pm.settle{value: uint256(uint128(-a0))}();
        uint256 out = uint256(uint128(a1));
        require(out >= minOut, "slippage");
        pm.take(key.currency1, to, out);

        // Refund any ETH the swap didn't consume (partial fill at a limit).
        uint256 dust = amountIn - uint256(uint128(-a0));
        if (dust > 0) {
            (bool ok, ) = to.call{value: dust}("");
            require(ok, "refund");
        }
        return abi.encode(out);
    }

    receive() external payable {}
}
