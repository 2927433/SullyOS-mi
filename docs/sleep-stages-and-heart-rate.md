# 睡眠分期与普通心率（二改）

快捷指令健康协议仍是 version=1。metrics 新增 heartRateLatest、heartRateAverage、heartRateMin、heartRateMax、heartRateSampleCount；它们是查询窗口内采样统计，不是连续心率或睡眠心率。

顶层 sleepSamples 支持最多 2000 条 {stage,start,end,source?}，stage 可为系统睡眠枚举文本、中英阶段名或对应枚举数值，时间为完整 ISO 日期。只在本机聚合，保存的是现有 SleepPayload，不保存整个原始分段列表。sleep 与 sleepSamples 不可同传。

健康 JSON 上限 200000 字符，完整 URL / 编码传递外壳与文件上限 750000；批量多年历史仍走睡眠文件入口。睡眠 JSON 文件也可包含 sleepSamples。无阶段数据不补零，无法识别的阶段明确报错，不用持续时间冒充阶段。

同来源区间并集去重，卧床不算已睡眠；按超过两小时的分段间隔切开不同睡眠记录，避免午睡与整夜连成一次。阶段合计异常时在摘要提示核对来源，不把日常心率极值当作睡眠心率。

同起止记录重复导入只补此前缺失的阶段，不覆盖用户已有时长、阶段、确认状态或角色卡片。睡眠页显示最新归档阶段卡，sleepSummary 将阶段传入现有前台 / fire_pack 注入。保留原权限开关，不在导入时额外调用 LLM；质量讨论沿用普通聊天。

解读约束由 SLEEP_ANALYSIS_GUIDE 共用：穿戴设备估计不是诊断，不凭单夜深睡 / REM 比例下绝对结论，缺失不等于零，不伪造 Apple 评分；结合总时长、实际清醒记录、多日规律与醒后体感。原 XML / CSV / JSON、完整备份与本机数据不清理。
