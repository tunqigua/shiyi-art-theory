/*
  正式题库接入点。
  用户提供题库后，只需按以下结构替换 questions 数组；界面与记录功能无需重写。
*/
window.SHIYI_QUESTION_BANK = {
  version: "demo-1",
  chapters: Array.from({ length: 12 }, function (_, index) {
    return {
      id: index + 1,
      title: "第" + (index + 1) + "章",
      subtitle: index === 0 ? "3 道结构演示题" : "等待正式题库"
    };
  }),
  questions: [
    {
      id: "demo-1-01",
      chapter: 1,
      stem: "关于艺术起源的“模仿说”，下列表述中最准确的是？",
      options: [
        "艺术只源于宗教祭祀",
        "艺术是纯粹的情绪宣泄",
        "艺术源于人对现实对象与行为的摹仿",
        "艺术源于文字记录的需要"
      ],
      answer: 2,
      explanation: "“模仿说”把艺术的发生与人对自然、生活和行为的摹仿联系起来，是较早出现的艺术起源理论之一。",
      demo: true
    },
    {
      id: "demo-1-02",
      chapter: 1,
      stem: "在完整的艺术活动中，艺术作品主要连接艺术家与哪一方？",
      options: ["艺术材料", "艺术接受者", "自然环境", "生产工具"],
      answer: 1,
      explanation: "艺术活动通常包含艺术创作、艺术作品与艺术接受。作品是艺术家与接受者之间实现审美交流的中介。",
      demo: true
    },
    {
      id: "demo-1-03",
      chapter: 1,
      stem: "艺术作品的审美价值，首先通过什么被感知和把握？",
      options: ["艺术形象", "市场价格", "作者履历", "展览规模"],
      answer: 0,
      explanation: "艺术以具体可感的艺术形象呈现审美意蕴。市场、履历或展览规模都不是艺术审美价值的首要载体。",
      demo: true
    }
  ]
};
