/**
 * 演示模式必须在构建时显式启用；没有真实后端不再隐式启用任意密码的演示鉴权。
 * 公开演示站与演示测试由部署/测试配置明确选择此模式。
 */
export const DEMO_MODE = UMI_APP_DEMO_MODE === true;
