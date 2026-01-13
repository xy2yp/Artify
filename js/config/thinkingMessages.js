/**
 * Thinking messages configuration
 * Fun messages to display during image generation
 */

/**
 * Array of fun thinking messages
 * Messages are displayed in order during generation process
 */
export const THINKING_MESSAGES = [
    '🔄 正在将文字翻译成像素语言...',
    '💡 灵感灯泡刚换了个更亮的...',
    '🐱 灵感像猫一样，正在慢慢靠近...',
    '🎨 我的艺术细胞正在疯狂分裂...',
    '🚀 创意引擎启动！向艺术宇宙进发...',
    '🎯 正在寻找最完美的构图角度...',
    '📐 正在计算黄金分割的最佳位置...',
    '🖌️ 画笔已就位，等待缪斯降临...',
    '🧠 神经网络正在做美丽的白日梦...',
    '🤖 模型正在脑海中过电影...',
    '🌀 GPU风扇转得比我的脑子还快...',
    '🖥️ 显卡说：我还能再抢救一下...',
    '🌟 创意大爆炸后的冷却时间...',
    '🔍 像素们正在排队站好...',
    '🧚 像素精灵正在画布上开派对...',
    '🔮 水晶球里看到了...等等，马上就清晰了...',
    '🎭 给每个像素都安排上戏...',
    '🎨 调色板上的颜色们正在猜拳...',
    '🌈 让颜色在光谱上跳支舞...',
    '✨ 魔法加载中，添加最后的点睛之笔...',
    '🎪 见证奇迹前的最后3秒...',
    '🌟 星星点灯，为作品注入灵魂...',
    '⏳ 别急，好图值得等待...'
];

/**
 * Rotation intervals in milliseconds
 * Random selection from these values for more natural feel
 */
export const ROTATION_INTERVALS = [2000, 3000, 4000];

/**
 * Current message index for sequential display
 * Resets to 0 when reaching the end
 */
let currentIndex = 0;

/**
 * Gets the first thinking message (used for initialization)
 * @returns {string} First thinking message
 */
export function getFirstThinkingMessage() {
    currentIndex = 0;
    return THINKING_MESSAGES[0];
}

/**
 * Gets the next thinking message in sequence
 * @returns {string} Next thinking message
 */
export function getNextThinkingMessage() {
    currentIndex = (currentIndex + 1) % THINKING_MESSAGES.length;
    return THINKING_MESSAGES[currentIndex];
}

/**
 * Resets the message index to start
 */
export function resetThinkingIndex() {
    currentIndex = 0;
}

/**
 * Gets a random thinking message (deprecated - use getNextThinkingMessage instead)
 * @returns {string} Random thinking message
 */
export function getRandomThinkingMessage() {
    const index = Math.floor(Math.random() * THINKING_MESSAGES.length);
    return THINKING_MESSAGES[index];
}

/**
 * Gets a random rotation interval
 * @returns {number} Random interval in milliseconds
 */
export function getRandomInterval() {
    const index = Math.floor(Math.random() * ROTATION_INTERVALS.length);
    return ROTATION_INTERVALS[index];
}

// Export as default
export default {
    THINKING_MESSAGES,
    ROTATION_INTERVALS,
    getFirstThinkingMessage,
    getNextThinkingMessage,
    resetThinkingIndex,
    getRandomThinkingMessage,
    getRandomInterval
};
