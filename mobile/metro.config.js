const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// ==========================================
// 🔒 SOURCE CODE PROTECTION - Production Minification
// ==========================================
// Khi build production, Metro sẽ tự động:
// 1. Minify code (loại bỏ whitespace, comments)
// 2. Mangle tên biến (a, b, c thay vì descriptiveName)
// 3. Dead code elimination
// 4. Kết hợp với Hermes -> compile thành bytecode

// Custom transformer options for enhanced protection
config.transformer = {
  ...config.transformer,
  minifierPath: "metro-minify-terser",
  minifierConfig: {
    // Terser options for better obfuscation
    compress: {
      drop_console: true,        // Loại bỏ console.log trong production
      drop_debugger: true,       // Loại bỏ debugger statements
      dead_code: true,           // Loại bỏ code không sử dụng
      passes: 2,                 // 2 lần nén để tối ưu hơn
    },
    mangle: {
      toplevel: true,            // Mangle cả top-level variables
      properties: false,         // Không mangle properties (tránh lỗi runtime)
    },
    output: {
      comments: false,           // Loại bỏ tất cả comments
      ascii_only: true,          // Chỉ dùng ASCII characters
    },
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
