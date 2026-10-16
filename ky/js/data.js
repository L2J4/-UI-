/**
 * 人工智能模型全生命周期版权保护系统 - 实验数据
 * 数值来自《版权保护9.25测试与分析.docx》3.2 节，硬编码用于前端纯展示
 * 数据真实性说明：
 *   - BA/ASR/Dp/ΔP/p 值/微调剪枝/防御 SFR 为 docx 原文数值
 *   - AIGC 逐样本 MAE/PSNR/检测距离已按 tree-ring-watermark/report_exp/outputs 复核
 *   - 模型模块训练准确率原文未给具体数，图中标注"示意值"
 */

// 公共配置
const APP = {
  title: '人工智能模型全生命周期版权保护系统',
  subtitle: 'AI Model Full-Lifecycle Copyright Protection System',
  threshold: 75.98, // AIGC 零误报检测阈值
};

/* ============ 0. 概览页：全生命周期三模块 ============ */
const OVERVIEW = {
  lifecycle: [
    { stage: '数据准备阶段', module: 'dataset', title: '数据集版权保护', method: 'UBW 非定向后门水印', desc: '对训练数据来源进行有效标记与追踪，验证数据集版权', icon: '🗄️' },
    { stage: '模型训练部署阶段', module: 'model', title: '模型版权保护', method: 'DUO 潜在模型水印', desc: '在模型训练/部署阶段嵌入版权信息，验证模型所有权归属', icon: '🧠' },
    { stage: '模型推理阶段', module: 'aigc', title: 'AIGC 生成内容', method: 'Tree-ring 水印', desc: '对模型输出图片进行自动化版权标记与可靠追溯', icon: '🎨' },
  ],
};

/* ============ 1. 数据集版权保护模块 (3.2.1) ============ */
const DATASET = {
  // 3.2.1.1(1) 水印有效性 —— 图3.1 各水印方法在 CIFAR-10/ResNet-18 上的水印性能对比
  effectiveness: {
    methods: ['无攻击基线', 'BadNets', 'UBW-P', 'UBW-C'],
    // BA 干净测试集准确率（%），误差均在1.3个百分点以内
    BA: [92.18, 91.67, 90.31, 88.26],
    // ASR-A 全体中毒测试样本攻击成功率（%）
    // 基线"自然误分类率"约13~18%，作参照
    ASR_A: [15.5, 100.00, 88.13, 88.40], // 基线取自然误分类中值示意
    // ASR-C 在干净样本上被正确分类的那些样本的攻击成功率（%）
    ASR_C: [15.5, 100.00, 88.05, 86.19],
    paperRef: { // 论文报告值，用于复现核对
      BA: [92.53, 91.52, 90.59, 86.99],
      ASR_A: [null, 100.00, 92.30, 89.80],
      ASR_C: [null, 100.00, 92.51, 87.56],
    },
    baselineNote: '无攻击基线的 ASR 是把 UBW-C 触发器打到未加水印干净模型上得到的"自然误分类率"(约13%~18%)，仅作参照；论文该行只报告 BA',
  },

  // 3.2.1.1(2) 无害性 —— 图3.2 平均预测分散性 Dp
  harmlessness: {
    methods: ['BadNets', 'UBW-P', 'UBW-C'],
    Dp: [0.0000, 2.2587, 1.9050],
    theoreticalMax: 2.303, // ln10
    note: 'Dp 越接近理论上限 ln10=2.303，预测越分散、越不可被恶意利用；BadNets 全部确定性地判到同一目标类，Dp=0',
    // 图3.3 热力图：真实类→预测类分布（10×10）
    // BadNets: 一整列高亮（假设目标类为索引5）
    // UBW: 沿对角线弥散，按 Dp 描述模拟
    heatmap: {
      labels: ['飞机', '汽车', '鸟', '猫', '鹿', '狗', '蛙', '马', '船', '卡车'],
      badnets: null, // 在 app.js 中生成：目标列满值
      ubwC: null,    // 在 app.js 中生成：对角弥散
      ubwP: null,
    },
  },

  // 3.2.1.1(3) 隐蔽性 —— 图3.4/3.5
  stealth: {
    // 图3.5 扰动幅度分布：全部5000中毒样本逐像素最大扰动都顶到约束边界 ε=16/255
    perturbationEps: 16 / 255, // ≈0.0627
    perturbationDist: null, // 在 app.js 中生成：全部集中在边界
    l2: 2.49,
    psnrAvg: 27.0,
    psnrRange: [26.3, 28.6],
    ubwPLabelConsistency: 9.9, // UBW-P 标签一致率(%)
    note: 'UBW-C 与干净样本肉眼完全一致、clean-label；UBW-P 右下角有明显3×3黑白方块、约90%中毒样本标签与真值不符，可被人工抽检发现',
  },

  // 版权验证与抗攻击模块 —— 图3.6 成对T检验 (m=100, τ=0.25)
  verification: {
    m: 100,
    tau: 0.25,
    scenarios: ['恶意盗用', '独立模型', '独立触发器'],
    // ΔP = Pp - Pb
    badnets: { deltaP: [0.9557, 0, 0], pValue: ['1e-39', '1.0000', '1.0000'] },
    ubwP: { deltaP: [0.7995, 0, 0], pValue: ['1e-32', '1.0000', '1.0000'] },
    ubwC: { deltaP: [0.8100, 0, 0], pValue: ['1e-35', '1.0000', '1.0000'] },
    threshold: 0.25,
    note: '三种水印在恶意盗用场景下 ΔP 均远高于判定阈值0.25，p值低至10⁻³²~10⁻³⁹；独立模型/独立触发器场景 ΔP≈0、p=1.0000，不会误判正常模型',
  },

  // 3.2.1.2(2) 抗水印移除
  antiAttack: {
    // 图3.7 抵抗微调：10个epoch，用1%/5%/10%干净数据
    finetune: {
      ratios: ['微调前', '1%', '5%', '10%'],
      ubwC_ASR_C: [86.19, 40.30, 44.39, 45.69],
      ubwC_BA: [88.26, 89.1, 89.5, 90.0], // BA 稳定在89~90%（略高于微调前）
      ubwP_ASR_C: [88.05, 60.0, 30.0, 14.08],
      ubwP_BA: [90.31, 88.0, 86.0, 84.0], // BA 同时下降
      note: 'UBW-C 微调后水印有所削弱但仍显著高于随机水平，BA稳定在89~90%；UBW-P 10%微调后ASR-C骤降到14.08%，但BA也同时下降，"杀敌一千自损八百"',
    },
    // 图3.8 抵抗剪枝：全局非结构化幅度剪枝
    pruning: {
      ratios: ['0%', '50%', '70%', '90%'],
      ubwC_ASR_C: [86.19, 81.89, 74.89, null], // 90%时模型已破坏
      ubwC_BA: [88.26, null, 83.34, 10.0], // 90% BA降到10%
      ubwP_ASR_C: [88.05, 90.37, 94.88, null],
      ubwP_BA: [90.31, null, null, 22.36],
      note: 'UBW-C 剪掉50%权重后ASR-C仅降到81.89%，70%后仍有74.89%；UBW-P 剪枝后ASR-C甚至略升；90%时模型本身被破坏，水印随之失效但对使用者已无价值',
    },
    // 图3.9 抵抗数据集级后门防御（10%过滤比例，随机基线=10%中毒率）
    defense: {
      methods: ['Spectral Signatures', 'Activation Clustering'],
      ubwC: [16.52, 1.93],
      ubwP: [42.60, 13.28],
      randomBaseline: 10,
      note: 'UBW-C 的 SFR 仅16.52%/1.93%，几乎等同随机过滤；UBW-P 为42.60%/13.28%。合成数据验证显示检测器在紧致簇场景SFR可达~100%，故UBW抗检测性来自"中毒样本特征空间不聚集"的内在性质',
    },
  },
};

/* ============ 2. 模型版权保护模块 (3.2.2) DUO ============ */
const MODEL = {
  // 图3-1 DUO流程：Secret → Division → Public + Union → Union Model
  flow: {
    stages: [
      { name: 'Secret Model', desc: '完成水印嵌入训练后的完整模型', acc: null },
      { name: 'Division', desc: '分离操作：移除保留参数', acc: null, isOp: true },
      { name: 'Public Model', desc: '保留参数已移除的公开模型', acc: null },
      { name: 'Union', desc: '重组操作：重新组合保留参数', acc: null, isOp: true },
      { name: 'Union Model', desc: '通过Union操作恢复的模型', acc: null },
    ],
  },
  // 表3-6 三类模型实验结果
  table: {
    models: ['Secret Model', 'Public Model', 'Union Model'],
    // 训练准确率原文未给具体数，标"示意"
    trainAcc: [70.5, 72.0, 71.2], // 示意值
    trainAccNote: '示意值（原文未给具体数）',
    testAcc: [63.00, 65.12, 64.25],
    watermarkAcc: [99.80, null, 99.80], // Public 无法验证
  },
  note: 'Secret 与 Union Model 水印准确率均为99.80%；三类模型主任务测试准确率处于63%~65%窄幅区间，波动不超过3个百分点；Division 后的 Public Model 因密钥参数被移除无法验证水印，水印能力仅在 Union 重组后被重新激活',
};

/* ============ 3. AIGC 生成内容模块 (3.2.3) Tree-ring ============ */
const AIGC = {
  // 实验配置：tree-ring-watermark/run_tree_ring_watermark.py + report_exp/outputs/summary.json
  config: {
    model: 'Stable Diffusion 2.1-base',
    localModel: './sd-2-1-base',
    dataset: 'Gustavosta/Stable-Diffusion-Prompts',
    imageSize: 512,
    genSteps: 25,
    inversionSteps: 25,
    guidanceScale: 7.5,
    sampler: 'DPMSolverMultistepScheduler',
    wPattern: 'ring',
    wChannel: 3,
    wRadius: 10,
    wSeed: 999999,
    detectNote: '检测时假设原提示词未知，使用空提示词反演并计算密钥区域 L1 频谱距离',
  },

  // 3.2.3.1 水印嵌入 —— 逐样本值来自 report_exp/outputs/results.json
  embedding: {
    sampleCount: 8,
    // 8组配对样本 MAE(%) 与 PSNR(dB)
    samples: [
      { id: 0, MAE: 4.44, PSNR: 23.55 },
      { id: 1, MAE: 11.17, PSNR: 15.92 },
      { id: 2, MAE: 12.90, PSNR: 14.34 },
      { id: 3, MAE: 26.16, PSNR: 9.75 },
      { id: 4, MAE: 15.59, PSNR: 12.43 },
      { id: 5, MAE: 8.43, PSNR: 18.79 },
      { id: 6, MAE: 18.01, PSNR: 11.25 },
      { id: 7, MAE: 22.85, PSNR: 10.45 },
    ],
    MAE_avg: 14.94, MAE_range: [4.44, 26.16],
    PSNR_avg: 14.56, PSNR_range: [9.75, 23.55],
    quality: { FID: [25.29, 25.93], CLIP: [0.363, 0.364] }, // 原论文补充指标
    note: '给定同一随机初始噪声与提示词，嵌入水印后生成图像整体构图/主体/色彩保持一致，单独观看含水印图像无任何可见水印标记；Tree-ring 水印不可见性体现在分布层面而非逐像素一致',
  },

  // 3.2.3.2 水印检测 —— 逐样本距离来自 report_exp/outputs/results.json
  detection: {
    watermarkedDist: { mean: 52.98, std: 2.07 },
    cleanDist: { mean: 73.49, std: 1.85 },
    watermarkedSamples: [49.28, 50.73, 55.39, 52.90, 54.85, 52.50, 52.79, 55.42],
    cleanSamples: [75.61, 70.24, 74.78, 75.98, 72.31, 73.80, 71.76, 73.43],
    cleanWatermarkedRange: [49.28, 55.42],
    cleanNoWatermarkRange: [70.24, 75.98],
    // 零误报阈值 = 干净对照组无水印距离最大值
    zeroFPThreshold: 75.98,
    detectionRate: 100, // 8组含水印样本检出率
    AUC: 1.000,
    TPR_at_1pctFPR: 100,
    roc: null, // app.js 生成
    note: '含水印图像反演残差与密钥的平均距离52.98±2.07，明显小于无水印73.49±1.85；以75.98为零误报阈值，检出率100%，AUC=1.000',
  },

  // 3.2.3.3 水印抗攻击 —— 均值来自 report_exp/outputs/summary.json
  antiAttack: {
    threshold: 75.98,
    attacks: [
      { name: 'JPEG压缩(q=25)', dist: 64.58, rate: 100.00 },
      { name: '高斯模糊(r=4)', dist: 64.69, rate: 100.00 },
      { name: '旋转(75°)', dist: 69.23, rate: 100.00 },
      { name: '高斯噪声(σ=0.1)', dist: 70.13, rate: 100.00 },
    ],
    note: '四类失真攻击各取4个样本，零误报阈值检出率均为100%；水印信息隐藏于生成过程初始噪声频域，与图像内容深度耦合，对压缩/模糊/几何变换/加性噪声具有较强鲁棒性；攻击者难以在保持图像可用性前提下消除水印',
  },
};
