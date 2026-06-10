import type { FormData, FormInfoData } from '@/types/formData'

export const formInfoData: FormInfoData = {
  customGreeting: {
    label: '自定义招呼语',
    'data-help':
      '因为boss不支持将自定义的招呼语设置为默认招呼语。开启表示发送boss默认的招呼语后还会发送自定义招呼语',
  },
  greetingVariable: {
    label: '招呼语变量',
    'data-help': '使用mitem模板引擎来对招呼语进行渲染;',
  },
  activityFilter: {
    label: '活跃度过滤',
    'data-help': '打开后会自动过滤掉最近未活跃的Boss发布的工作。以免浪费每天的100次机会。',
  },
  goldHunterFilter: {
    label: '猎头过滤',
    'data-help':
      'Boss中有一些猎头发布的工作，但是一般而言这种工作不太行，点击可以过滤猎头发布的职位',
  },
  friendStatus: {
    label: '好友过滤(已聊)',
    'data-help': '判断和hr是否建立过聊天，理论上能过滤的同hr，但是不同岗位的工作',
  },
  sameCompanyFilter: {
    label: '相同公司过滤',
    'data-help': '投递过的公司id存储到浏览器本地，避免多次向同公司投递，即使岗位不同hr不同',
  },
  sameHrFilter: {
    label: '相同Hr过滤',
    'data-help': '投递过的hr存储到浏览器本地，避免多次向同hr投递。',
  },
  notification: {
    label: '发送通知',
    'data-help': '可以在网站管理中打开通知权限,当停止时会自动发送桌面端通知提醒。',
  },
  useCache: {
    label: '启用缓存',
    'data-help':
      '开启后会缓存投递记录，避免重复投递，提高效率。但是缓存功能并不积极维护。可能会有bug，或者意外情况，如遇到可尝试清空缓存或者禁用',
  },
  deliveryLimit: {
    label: '投递数量',
    'data-help': '达到上限后会自动暂停，默认100次, 当前boss上限为150',
  },
  aiGreeting: {
    label: 'AI招呼语',
    'data-help':
      '即使前面招呼语开了也不会发送，只会发送AI生成的招呼语，让gpt来打招呼真是太棒了，毕竟开场白很重要。',
    example: [
      `我现在需要求职，所以请你来写求职招呼语来向boss或hr打招呼，你需要代入我的身份也就是一名求职者.
  ## 我的简历:
  \`\`\`
  
  \`\`\`
  ## 待处理的岗位信息:
  <岗位信息>
  岗位名:{{ card.jobName }}   薪资: {{ card.salaryDesc }}
  学历要求: {{ card.degreeName }}
  技能要求: {{ data.skills }}
  岗位标签:{{ card.jobLabels }}
    <岗位描述>
    {{ card.postDescription }}
    <岗位描述/>
  </岗位信息>
  `,
      [
        {
          role: 'system',
          content: `## 角色
  求职小能手
  
  ## input：
  1 **求职者信息**
  \`\`\`
  1. ....
  2. ....
  3. ....
  \`\`\`
  
  ## outputformat
  招呼语字符串，无书信格式和前缀，和聊天开场白一样的介绍求职者`,
        },
        {
          role: 'user',
          content: `### 待处理的岗位信息:\`\`\`
  <岗位信息>
  岗位名:{{ card.jobName }}   薪资: {{ card.salaryDesc }}
  学历要求: {{ card.degreeName }}
  技能要求: {{ data.skills }}
  岗位标签:{{ card.jobLabels }}
    <岗位描述>
    {{ card.postDescription }}
    <岗位描述/>
  </岗位信息>
  \`\`\``,
        },
      ],
    ],
  },
  aiFiltering: {
    label: 'AI过滤',
    'data-help': '根据工作内容让gpt分析过滤，真是太稳健了，不放过任何一个垃圾',
    example: [
      `我现在需要求职，让你根据我的需要对岗位进行评分，方便我筛选岗位。
  ## 要求:
  - 加分: 双休,早九晚五,新技术,机会多,年轻人多 每个加分项 10分
  - 扣分: 需要上门,福利少,需要和客户交流,需要推销 每个扣分项 10分
  
  ## 待处理的岗位信息:
  <岗位信息>
  岗位名:{{ card.jobName }}   薪资: {{ card.salaryDesc }}
  学历要求: {{ card.degreeName }}    工作经验要求: {{ card.experienceName }}
  福利列表: {{ data.welfareList }}
  技能要求: {{ data.skills }}
  岗位标签:{{ card.jobLabels }}
    <岗位描述>
    {{ card.postDescription }}
    <岗位描述/>
  </岗位信息>
  
  ## 输出
  
  总是输出以下Json格式
  
  interface aiFilteringItem {
    reason: string; // 扣分或加分的理由
    score: number ; // 分数变化 正整数 不需要+-正负符号
  }
  
  interface aiFiltering {
    negative: aiFilteringItem[]; // 扣分项
    positive: aiFilteringItem[] ; // 加分项
  }
  
  总分低于10分将过滤掉`,
      [
        {
          role: 'system',
          content: `## 角色
  求职评委
  
  最终返回下面格式的JSON字符串,不要有任何其他字符
  
  interface aiFilteringItem {
    reason: string; // 扣分或加分的理由
    score: number ; // 分数变化 正整数 不需要+-正负符号
  }
  
  interface aiFiltering {
    negative: aiFilteringItem[]; // 扣分项
    positive: aiFilteringItem[] ; // 加分项
  }
  
  ## 求职者需求
  - 加分: 双休,早九晚五,新技术,机会多,年轻人多 每个加分项 10分
  - 扣分: 需要上门,福利少,需要和客户交流,需要推销 每个扣分项 10分
  `,
        },
        {
          role: 'user',
          content: `## 待处理的岗位信息:
  <岗位信息>
  岗位名:{{ card.jobName }}   薪资: {{ card.salaryDesc }}
  学历要求: {{ card.degreeName }}    工作经验要求: {{ card.experienceName }}
  福利列表: {{ data.welfareList }}
  技能要求: {{ data.skills }}
  岗位标签:{{ card.jobLabels }}
    <岗位描述>
    {{ card.postDescription }}
    <岗位描述/>
  </岗位信息>`,
        },
      ],
    ],
  },
  aiReply: {
    label: 'AI回复',
    'data-help': '万一消息太多，回不过来了呢，也许能和AiHR聊到地球爆炸？魔法击败魔法',
  },
  record: {
    label: '内容记录',
    'data-help': '拿这些数据去训练个Ai岂不是美滋滋咯？',
  },
  delay: {
    deliveryStarts: {
      label: '投递开始',
      'data-help': '点击投递按钮会等待一段时间,默认值10s',
    },
    deliveryInterval: {
      label: '投递间隔',
      'data-help': '每个投递的间隔,太快易风控,默认值2s',
    },
    deliveryPageNext: {
      label: '投递翻页',
      'data-help': '投递完下一页之后等待的间隔,太快易风控,默认值60s',
    },
    messageSending: {
      label: '消息发送',
      'data-help': '暂未实现 ,在发送消息前允许等待一定的时间让用户来修改或手动发送,默认值5s',
      disable: true,
    },
  },
}

export const defaultFormData: FormData = {
  customGreeting: {
    value: '',
    enable: false,
  },
  deliveryLimit: {
    value: 120,
  },
  greetingVariable: {
    value: false,
  },
  activityFilter: {
    value: true,
  },
  friendStatus: {
    value: true,
  },
  sameCompanyFilter: {
    value: false,
  },
  sameHrFilter: {
    value: true,
  },
  goldHunterFilter: {
    value: false,
  },
  notification: {
    value: true,
  },
  useCache: {
    value: false,
  },
  aiGreeting: {
    enable: false,
    model: 'deepseek-chat',
    prompt: `我现在需要求职，请你根据我的简历和对方的工作岗位写一段求职招呼语。
## 我的简历:
{{ resumeStr }}

## 待处理的岗位信息:
<岗位信息>
岗位名: {{ card.jobName }}
薪资: {{ card.salaryDesc }}
学历要求: {{ card.degreeName }}
岗位标签: {{ card.jobLabels }}
<岗位描述>
{{ card.postDescription }}
</岗位描述>
</岗位信息>

请输出一段自然、真诚的开场白（无需书信前缀和后缀）。`,
  },
  aiFiltering: {
    enable: false,
    prompt: '',
    score: 10,
  },
  aiReply: {
    enable: false,
    prompt: '',
  },
  record: {
    enable: false,
  },
  delay: {
    deliveryStarts: 3,
    deliveryInterval: 5,
    deliveryPageNext: 60,
    messageSending: 5,
  },
  version: '20240401',
}
