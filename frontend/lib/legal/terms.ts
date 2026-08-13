import type { LegalDocSet } from "./types";

/**
 * Terms of service.
 *
 * The clause that actually matters for this product is the first one: plans are
 * generated from articulation data and an AI model, both of which can be wrong,
 * and a student who relies on a wrong plan can lose a year. Everything else is
 * ordinary consumer terms.
 *
 * Deliberately no arbitration clause: it buys little at this size and California
 * courts scrutinise it in consumer contracts.
 *
 * [OPERATOR NAMES] must be replaced with the real operators before publishing.
 */
const terms: LegalDocSet = {
  en: {
    title: "Terms of service",
    updated: "Last updated 12 August 2026",
    intro:
      "These terms cover your use of CourseBridge. The most important part is the first section, so please read that one even if you skip the rest.",
    sections: [
      {
        heading: "CourseBridge is a planning tool, not advice",
        body: [
          "CourseBridge builds a suggested plan from published articulation data and an AI model. Both can be out of date, incomplete, or simply wrong. Requirements also change between catalog years and vary by campus and major.",
          "Always confirm your plan against ASSIST.org, your college's official catalog, and a counsellor at your college before you enrol in anything. Treat what you see here as a starting point for that conversation, not a substitute for it.",
          "We do not guarantee admission, transfer eligibility, or any particular academic outcome. Decisions about your education remain yours.",
        ],
      },
      {
        heading: "We are independent",
        body: [
          "CourseBridge is operated by [OPERATOR NAMES] and is not affiliated with, endorsed by, or connected to ASSIST, the University of California, the California State University, or any community college.",
        ],
      },
      {
        heading: "Who can use it",
        body: [
          "You must be at least 13 years old to use CourseBridge. If you are under 18, please involve a parent, guardian or counsellor in decisions about your transfer plan.",
          "CourseBridge is offered in the United States only.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You are responsible for keeping your login details secure and for activity that happens under your account. Give us accurate information, and keep your college, major and target campuses up to date, because the plan is only as good as what it is built from.",
          "Tell us at privacy@coursebridge.us if you think someone else has accessed your account.",
        ],
      },
      {
        heading: "Using the service fairly",
        body: [
          "Please do not:",
          "- Scrape, bulk download, or resell the data or plans CourseBridge produces.",
          "- Try to break, overload, or work around limits on the service, including the AI assistant.",
          "- Use the assistant for anything other than transfer planning, or to generate content that is unlawful, harassing, or designed to deceive.",
          "- Upload documents that are not yours to upload.",
          "We may suspend accounts that do these things.",
        ],
      },
      {
        heading: "The AI assistant",
        body: [
          "The assistant is an AI language model. It can be confidently wrong, and it can produce answers that look authoritative but are not. Check anything that matters before acting on it.",
          "We send your messages, along with your college, major, target campuses and completed courses, to our model provider so it can answer usefully. We do not store the conversation afterwards.",
        ],
      },
      {
        heading: "Free while in beta",
        body: [
          "CourseBridge is currently free. We may change that in future, but we will not start charging for something you are already using without telling you first.",
          "Because we are in beta, features may change or disappear, and the service may be unavailable at times.",
        ],
      },
      {
        heading: "No warranty",
        body: [
          "CourseBridge is provided as is and as available, without warranties of any kind, whether express or implied. We do not warrant that the service will be uninterrupted, error free, or that the information in it is accurate or complete.",
        ],
      },
      {
        heading: "Limitation of liability",
        body: [
          "To the fullest extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages, or for lost opportunities, delayed graduation, or academic outcomes arising from your use of CourseBridge.",
          "Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you. Nothing here limits liability that cannot lawfully be limited.",
        ],
      },
      {
        heading: "Ending your use",
        body: [
          "You can stop using CourseBridge at any time, and you can ask us to delete your account by emailing privacy@coursebridge.us.",
          "We may suspend or end access if you break these terms, or if we stop offering the service.",
        ],
      },
      {
        heading: "Governing law and language",
        body: [
          "These terms are governed by the laws of the State of California, without regard to its conflict of laws rules. Any dispute will be handled in the state or federal courts located in California.",
          "These terms are published in several languages. If there is any difference between versions, the English version governs.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If we change these terms we will update the date at the top, and we will tell account holders by email before a material change takes effect. Continuing to use CourseBridge after that means you accept the new terms.",
        ],
      },
      {
        heading: "Contact",
        body: ["Questions about these terms: privacy@coursebridge.us."],
      },
    ],
  },

  es: {
    title: "Términos del servicio",
    updated: "Última actualización: 12 de agosto de 2026",
    intro:
      "Estos términos regulan tu uso de CourseBridge. La parte más importante es la primera sección, así que léela aunque te saltes el resto.",
    sections: [
      {
        heading: "CourseBridge es una herramienta de planificación, no asesoramiento",
        body: [
          "CourseBridge crea un plan sugerido a partir de datos de articulación publicados y de un modelo de IA. Ambos pueden estar desactualizados, incompletos o simplemente equivocados. Además, los requisitos cambian entre años de catálogo y varían según el campus y la especialidad.",
          "Confirma siempre tu plan en ASSIST.org, en el catálogo oficial de tu universidad y con un consejero de tu institución antes de matricularte en nada. Considera lo que ves aquí como un punto de partida para esa conversación, no como un sustituto de ella.",
          "No garantizamos la admisión, la elegibilidad para transferencia ni ningún resultado académico concreto. Las decisiones sobre tu educación siguen siendo tuyas.",
        ],
      },
      {
        heading: "Somos independientes",
        body: [
          "CourseBridge es operado por [OPERATOR NAMES] y no está afiliado, respaldado ni vinculado a ASSIST, la Universidad de California, la Universidad Estatal de California ni ningún community college.",
        ],
      },
      {
        heading: "Quién puede usarlo",
        body: [
          "Debes tener al menos 13 años para usar CourseBridge. Si eres menor de 18, involucra a un padre, tutor o consejero en las decisiones sobre tu plan de transferencia.",
          "CourseBridge se ofrece únicamente en Estados Unidos.",
        ],
      },
      {
        heading: "Tu cuenta",
        body: [
          "Eres responsable de mantener seguros tus datos de acceso y de la actividad que ocurra en tu cuenta. Facilítanos información exacta y mantén actualizados tu universidad, especialidad y campus objetivo, porque el plan solo es tan bueno como los datos con los que se construye.",
          "Escríbenos a privacy@coursebridge.us si crees que alguien más ha accedido a tu cuenta.",
        ],
      },
      {
        heading: "Uso responsable del servicio",
        body: [
          "Por favor, no hagas lo siguiente:",
          "- Extraer, descargar de forma masiva o revender los datos o los planes que genera CourseBridge.",
          "- Intentar dañar o sobrecargar el servicio, ni eludir sus límites, incluido el asistente de IA.",
          "- Usar el asistente para algo distinto de la planificación de transferencia, o para generar contenido ilegal, de acoso o destinado a engañar.",
          "- Subir documentos que no te corresponda subir.",
          "Podemos suspender las cuentas que hagan estas cosas.",
        ],
      },
      {
        heading: "El asistente de IA",
        body: [
          "El asistente es un modelo de lenguaje de IA. Puede equivocarse con total seguridad y puede dar respuestas que parecen fiables sin serlo. Verifica cualquier cosa importante antes de actuar en consecuencia.",
          "Enviamos tus mensajes, junto con tu universidad, especialidad, campus objetivo y cursos completados, a nuestro proveedor del modelo para que pueda responder de forma útil. Después no almacenamos la conversación.",
        ],
      },
      {
        heading: "Gratis durante la beta",
        body: [
          "CourseBridge es gratuito por ahora. Es posible que eso cambie en el futuro, pero no empezaremos a cobrar por algo que ya estés usando sin avisarte antes.",
          "Al estar en beta, las funciones pueden cambiar o desaparecer, y el servicio puede no estar disponible en algunos momentos.",
        ],
      },
      {
        heading: "Sin garantías",
        body: [
          "CourseBridge se ofrece tal cual y según disponibilidad, sin garantías de ningún tipo, expresas o implícitas. No garantizamos que el servicio funcione sin interrupciones ni errores, ni que su información sea exacta o completa.",
        ],
      },
      {
        heading: "Limitación de responsabilidad",
        body: [
          "En la máxima medida permitida por la ley, no somos responsables de daños indirectos, incidentales, especiales o consecuentes, ni de oportunidades perdidas, retrasos en la graduación o resultados académicos derivados de tu uso de CourseBridge.",
          "Algunas jurisdicciones no permiten ciertas limitaciones, por lo que partes de esta sección podrían no aplicarse en tu caso. Nada de lo aquí expuesto limita la responsabilidad que legalmente no puede limitarse.",
        ],
      },
      {
        heading: "Fin del uso",
        body: [
          "Puedes dejar de usar CourseBridge cuando quieras, y puedes pedirnos que eliminemos tu cuenta escribiendo a privacy@coursebridge.us.",
          "Podemos suspender o cancelar el acceso si incumples estos términos o si dejamos de ofrecer el servicio.",
        ],
      },
      {
        heading: "Ley aplicable e idioma",
        body: [
          "Estos términos se rigen por las leyes del Estado de California, sin atender a sus normas sobre conflicto de leyes. Cualquier disputa se resolverá ante los tribunales estatales o federales de California.",
          "Estos términos se publican en varios idiomas. Si hay alguna diferencia entre versiones, prevalece la versión en inglés.",
        ],
      },
      {
        heading: "Cambios",
        body: [
          "Si modificamos estos términos, actualizaremos la fecha en la parte superior y avisaremos por correo a los titulares de cuentas antes de que entre en vigor un cambio importante. Seguir usando CourseBridge después de eso significa que aceptas los nuevos términos.",
        ],
      },
      {
        heading: "Contacto",
        body: ["Preguntas sobre estos términos: privacy@coursebridge.us."],
      },
    ],
  },

  zh: {
    title: "服务条款",
    updated: "最后更新：2026 年 8 月 12 日",
    intro:
      "本条款适用于你对 CourseBridge 的使用。最重要的是第一节，即使其余部分略过，也请阅读该节。",
    sections: [
      {
        heading: "CourseBridge 是规划工具，不是专业建议",
        body: [
          "CourseBridge 根据公开的课程对接数据和 AI 模型生成建议计划。两者都可能过时、不完整，或者根本就是错的。此外，要求会随目录年份变化，也因校区和专业而异。",
          "在选课之前，请务必通过 ASSIST.org、你所在学院的官方目录以及学院的辅导员核实你的计划。请把这里看到的内容当作与辅导员讨论的起点，而不是替代品。",
          "我们不保证录取、转学资格或任何特定的学业结果。关于学业的决定仍由你自己作出。",
        ],
      },
      {
        heading: "我们是独立的",
        body: [
          "CourseBridge 由 [OPERATOR NAMES] 运营，与 ASSIST、加州大学、加州州立大学或任何社区学院均无隶属、认可或关联关系。",
        ],
      },
      {
        heading: "谁可以使用",
        body: [
          "使用 CourseBridge 需年满 13 周岁。如果你未满 18 周岁，请让家长、监护人或辅导员参与关于转学计划的决定。",
          "CourseBridge 仅在美国提供服务。",
        ],
      },
      {
        heading: "你的账号",
        body: [
          "你有责任妥善保管登录信息，并对账号下发生的活动负责。请提供准确的信息，并及时更新你的学院、专业和目标校区，因为计划的质量取决于所依据的信息。",
          "如果你认为有他人访问了你的账号，请发送邮件至 privacy@coursebridge.us 告知我们。",
        ],
      },
      {
        heading: "合理使用服务",
        body: [
          "请不要：",
          "- 抓取、批量下载或转售 CourseBridge 的数据或生成的计划。",
          "- 试图破坏服务、造成过载，或规避服务限制，包括对 AI 助手的限制。",
          "- 将助手用于转学规划以外的用途，或用于生成违法、骚扰性或意图欺骗的内容。",
          "- 上传本不应由你上传的文件。",
          "对于存在上述行为的账号，我们可能予以停用。",
        ],
      },
      {
        heading: "AI 助手",
        body: [
          "该助手是 AI 语言模型。它可能非常自信地给出错误答案，也可能生成看起来权威但并不准确的内容。凡是重要的信息，请先核实再据以行动。",
          "我们会将你的消息，连同你的学院、专业、目标校区和已修课程，发送给模型服务提供商，以便生成有用的回答。之后我们不会存储该对话。",
        ],
      },
      {
        heading: "测试期间免费",
        body: [
          "CourseBridge 目前免费。未来可能会有所调整，但我们不会在未事先告知的情况下，对你已在使用的功能开始收费。",
          "由于处于测试阶段，功能可能变更或下线，服务也可能出现暂时不可用的情况。",
        ],
      },
      {
        heading: "不提供担保",
        body: [
          "CourseBridge 按“现状”和“可获得”的状态提供，不作任何明示或默示的担保。我们不保证服务不中断、无错误，也不保证其中的信息准确或完整。",
        ],
      },
      {
        heading: "责任限制",
        body: [
          "在法律允许的最大范围内，对于因你使用 CourseBridge 而产生的间接、附带、特殊或后果性损害，以及机会损失、延迟毕业或学业结果，我们不承担责任。",
          "部分司法辖区不允许某些限制，因此本节的部分内容可能不适用于你。本条款不限制依法不可限制的责任。",
        ],
      },
      {
        heading: "终止使用",
        body: [
          "你可以随时停止使用 CourseBridge，也可以发送邮件至 privacy@coursebridge.us 要求我们删除你的账号。",
          "如果你违反本条款，或我们停止提供该服务，我们可能会暂停或终止你的访问权限。",
        ],
      },
      {
        heading: "适用法律与语言",
        body: [
          "本条款受美国加利福尼亚州法律管辖，不适用其法律冲突规则。任何争议将由位于加利福尼亚州的州法院或联邦法院处理。",
          "本条款以多种语言发布。各版本如有差异，以英文版本为准。",
        ],
      },
      {
        heading: "条款变更",
        body: [
          "如果我们修改本条款，会更新顶部的日期，并在重大变更生效前通过邮件通知账号持有者。变更后继续使用 CourseBridge 即表示你接受新条款。",
        ],
      },
      {
        heading: "联系方式",
        body: ["关于本条款的问题：privacy@coursebridge.us。"],
      },
    ],
  },
};

export default terms;
