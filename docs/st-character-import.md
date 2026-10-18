# ST 角色卡导入

神经链接 → 导入：选 ST 导出的原始 PNG 或 JSON。无需配置 API，不上传远程服务。原 SullyOS PNG / JSON 入口保留。

支持 V1 顶层人设、V2 / V3 data 结构；PNG 标准 tEXt 的 base64 UTF-8 `chara` / `ccv3`，后者优先。复用 PNG 分块、CRC、长度和体积校验。图片没有元数据时明确提示使用原卡，不从卡面猜人设。PNG 卡面作为头像；JSON 不主动下载远程头像。

description、personality、scenario、system_prompt、mes_example、first_mes、alternate_greetings、post_history_instructions 映射到核心设定。示例和开场白明确标为参考，不创建历史消息；creator_notes 作为备注。仅映射白名单字段，不导入脚本、正则、凭据、界面扩展、远程资源或自动执行代码。

内嵌 character_book 条目复用 parseStandardWorldbook，按“角色名 · 书名”（缺书名时用角色世界书）分组，同步到世界书 App 并挂载给新角色。条目 ID 每次导入重新生成。保留本应用支持的关键词、辅助关键词、常驻、启停、顺序、位置、深度、角色和概率规则；不宣称支持 ST 全部高级世界书功能、宏、插件或 CHARX。

测试：utils/stCharacterCard.test.ts、utils/characterCard.test.ts、utils/pngShare.test.ts、utils/worldbook.test.ts。

参考：https://github.com/SillyTavern/SillyTavern/blob/release/src/character-card-parser.js
