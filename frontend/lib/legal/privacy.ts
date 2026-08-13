import type { LegalDocSet } from "./types";

/**
 * Privacy policy.
 *
 * Written against what the code actually does, not boilerplate. Before changing
 * any factual claim here, check it still holds:
 *   - transcript PDFs: app/api/parse-transcript/route.ts parses in memory only
 *   - chat storage: nothing calls /api/sessions, and /chat never writes to
 *     chat_messages, so conversations are not persisted
 *   - analytics: the CSP permits Google Analytics but nothing loads it
 *   - stored fields: see the users, saved_plans and feedback tables in
 *     backend/db.py
 *
 * [OPERATOR NAMES] must be replaced with the real operators before publishing.
 */
const privacy: LegalDocSet = {
  en: {
    title: "Privacy policy",
    updated: "Last updated 12 August 2026",
    intro:
      "This policy describes exactly what CourseBridge collects, what it does not, and who else sees it. It is written to match how the product actually works.",
    sections: [
      {
        heading: "Who we are",
        body: [
          "CourseBridge is operated by [OPERATOR NAMES]. We are an independent project and are not affiliated with ASSIST, the University of California, the California State University, or any community college.",
          "You can reach us about anything in this policy at privacy@coursebridge.us.",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "If you create an account, we store:",
          "- Your email address and, if you signed up with a password, a hashed version of that password. We never store the password itself.",
          "- Your name, and a profile photo if you upload one.",
          "- Your Google account identifier, if you sign in with Google.",
          "- Your community college, intended major, and the campuses you are targeting.",
          "- Your theme and language preferences.",
          "When you build a plan, we store the plan itself, along with the college, campus, major and the list of completed courses it was built from, so it is waiting for you next time.",
          "If you send us feedback on a plan or a reply, we store that feedback and, if you are signed in, which account it came from.",
          "We hold your IP address briefly in memory to enforce rate limits and prevent abuse. It is not written to our database.",
        ],
      },
      {
        heading: "What we do not collect",
        body: [
          "Some of this is unusual enough to be worth stating plainly.",
          "- Transcripts you upload are read in memory to pull out your course codes, and then discarded. The file is never written to disk and never reaches our database.",
          "- Conversations with the CourseBridge AI assistant are not saved. Each message is sent to our model provider to generate a reply and is not stored by us afterwards.",
          "- We do not run analytics or advertising, and there are no tracking cookies on this site.",
          "- We do not sell your information, and we do not share it for advertising.",
        ],
      },
      {
        heading: "Cookies and browser storage",
        body: [
          "We use one cookie: a session token that keeps you signed in. It is strictly necessary for the site to work, so we do not ask for cookie consent.",
          "Your browser also stores your draft profile, theme and language locally so the site works before you create an account. That data stays on your device and you can clear it at any time through your browser settings.",
        ],
      },
      {
        heading: "Who else sees your information",
        body: [
          "We use a small number of service providers, and only for the purposes listed:",
          "- Groq, which runs the AI model. Your messages and your college, major, target campuses and completed courses are sent to Groq so it can answer usefully.",
          "- Google, if you choose to sign in with Google.",
          "- Resend, which sends password reset emails.",
          "- Railway, which hosts the application and the database.",
          "We may also disclose information if the law requires it. Beyond that, nobody else receives your data.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Your account and saved plans stay until you ask us to delete them. Session tokens expire after 30 days, and password reset links expire shortly after they are issued.",
          "We are a beta product and we would rather hold less than more. If your account has been unused for a long time, we may delete it and will try to email you first.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can see and change your name, college, target campus, photo, theme and language at any time in Settings.",
          "To get a copy of your data, correct it, or have it deleted, email privacy@coursebridge.us from the address on your account. We will action deletion requests within 30 days, and that removes your account, your saved plans and your feedback.",
          "We do not currently have a self-serve delete button. Until we build one, email is the way, and we will honour it.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Passwords are hashed, the site is served over HTTPS, session cookies are HTTP-only, and each account can only ever read its own plans.",
          "No service can promise perfect security, and we are not going to pretend otherwise. If we ever discover a breach affecting your information, we will tell you and the relevant authorities as the law requires.",
        ],
      },
      {
        heading: "Age",
        body: [
          "CourseBridge is for students aged 13 and over. We do not knowingly collect information from children under 13. If you believe a child under 13 has given us information, email privacy@coursebridge.us and we will delete it.",
          "Some of our users are under 18. If you are, please talk to a parent, guardian or counsellor about your transfer plan as well as using this site.",
        ],
      },
      {
        heading: "Where we operate",
        body: [
          "CourseBridge is built for California community college students and is offered in the United States only. We do not target users in the European Union or the United Kingdom.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If we change this policy we will update the date at the top. If a change materially affects how we handle your information, we will tell account holders by email before it takes effect.",
        ],
      },
      {
        heading: "Contact",
        body: ["Questions, requests or complaints: privacy@coursebridge.us."],
      },
    ],
  },

  es: {
    title: "Política de privacidad",
    updated: "Última actualización: 12 de agosto de 2026",
    intro:
      "Esta política describe exactamente qué recopila CourseBridge, qué no recopila y quién más lo ve. Está redactada para reflejar cómo funciona realmente el producto.",
    sections: [
      {
        heading: "Quiénes somos",
        body: [
          "CourseBridge es operado por [OPERATOR NAMES]. Somos un proyecto independiente y no estamos afiliados a ASSIST, a la Universidad de California, a la Universidad Estatal de California ni a ningún community college.",
          "Puedes escribirnos sobre cualquier punto de esta política a privacy@coursebridge.us.",
        ],
      },
      {
        heading: "Qué recopilamos",
        body: [
          "Si creas una cuenta, guardamos:",
          "- Tu correo electrónico y, si te registraste con contraseña, una versión cifrada de esa contraseña. Nunca guardamos la contraseña en sí.",
          "- Tu nombre y una foto de perfil, si subes una.",
          "- Tu identificador de cuenta de Google, si inicias sesión con Google.",
          "- Tu community college, tu especialidad prevista y los campus a los que aspiras.",
          "- Tus preferencias de tema e idioma.",
          "Cuando creas un plan, guardamos el plan junto con la universidad, el campus, la especialidad y la lista de cursos completados con los que se creó, para que te espere la próxima vez.",
          "Si nos envías comentarios sobre un plan o una respuesta, guardamos esos comentarios y, si has iniciado sesión, desde qué cuenta se enviaron.",
          "Conservamos tu dirección IP brevemente en memoria para aplicar límites de uso y prevenir abusos. No se guarda en nuestra base de datos.",
        ],
      },
      {
        heading: "Qué no recopilamos",
        body: [
          "Parte de esto es lo bastante inusual como para decirlo con claridad.",
          "- Los historiales académicos que subes se leen en memoria para extraer los códigos de tus cursos y luego se descartan. El archivo nunca se guarda en disco ni llega a nuestra base de datos.",
          "- Las conversaciones con el asistente de CourseBridge AI no se guardan. Cada mensaje se envía a nuestro proveedor del modelo para generar una respuesta y después no lo almacenamos.",
          "- No usamos analítica ni publicidad, y no hay cookies de seguimiento en este sitio.",
          "- No vendemos tu información ni la compartimos con fines publicitarios.",
        ],
      },
      {
        heading: "Cookies y almacenamiento del navegador",
        body: [
          "Usamos una sola cookie: un token de sesión que mantiene tu sesión iniciada. Es estrictamente necesaria para que el sitio funcione, por lo que no solicitamos consentimiento de cookies.",
          "Tu navegador también guarda localmente tu perfil provisional, tu tema y tu idioma para que el sitio funcione antes de crear una cuenta. Esos datos permanecen en tu dispositivo y puedes borrarlos cuando quieras desde la configuración de tu navegador.",
        ],
      },
      {
        heading: "Quién más ve tu información",
        body: [
          "Trabajamos con un número reducido de proveedores, y solo para los fines indicados:",
          "- Groq, que ejecuta el modelo de IA. Tus mensajes y tu universidad, especialidad, campus objetivo y cursos completados se envían a Groq para que pueda responder de forma útil.",
          "- Google, si eliges iniciar sesión con Google.",
          "- Resend, que envía los correos de restablecimiento de contraseña.",
          "- Railway, que aloja la aplicación y la base de datos.",
          "También podemos divulgar información si la ley lo exige. Fuera de eso, nadie más recibe tus datos.",
        ],
      },
      {
        heading: "Cuánto tiempo lo conservamos",
        body: [
          "Tu cuenta y tus planes guardados permanecen hasta que nos pidas eliminarlos. Los tokens de sesión caducan a los 30 días y los enlaces de restablecimiento de contraseña caducan poco después de emitirse.",
          "Somos un producto en beta y preferimos conservar menos que más. Si tu cuenta lleva mucho tiempo sin usarse, podemos eliminarla e intentaremos avisarte antes por correo.",
        ],
      },
      {
        heading: "Tus opciones",
        body: [
          "Puedes ver y cambiar tu nombre, universidad, campus objetivo, foto, tema e idioma en cualquier momento desde Configuración.",
          "Para obtener una copia de tus datos, corregirlos o eliminarlos, escribe a privacy@coursebridge.us desde la dirección de tu cuenta. Atenderemos las solicitudes de eliminación en un plazo de 30 días, lo que borra tu cuenta, tus planes guardados y tus comentarios.",
          "Por ahora no tenemos un botón de eliminación automática. Hasta que lo creemos, el correo es la vía, y la respetaremos.",
        ],
      },
      {
        heading: "Seguridad",
        body: [
          "Las contraseñas se almacenan cifradas, el sitio se sirve por HTTPS, las cookies de sesión son HTTP-only y cada cuenta solo puede leer sus propios planes.",
          "Ningún servicio puede prometer seguridad perfecta y no vamos a fingir lo contrario. Si alguna vez detectamos una brecha que afecte a tu información, te lo comunicaremos a ti y a las autoridades correspondientes según exija la ley.",
        ],
      },
      {
        heading: "Edad",
        body: [
          "CourseBridge es para estudiantes de 13 años en adelante. No recopilamos conscientemente información de menores de 13 años. Si crees que un menor de 13 años nos ha dado información, escribe a privacy@coursebridge.us y la eliminaremos.",
          "Algunos de nuestros usuarios son menores de 18 años. Si es tu caso, habla también con un padre, tutor o consejero sobre tu plan de transferencia además de usar este sitio.",
        ],
      },
      {
        heading: "Dónde operamos",
        body: [
          "CourseBridge está diseñado para estudiantes de community colleges de California y se ofrece únicamente en Estados Unidos. No nos dirigimos a usuarios de la Unión Europea ni del Reino Unido.",
        ],
      },
      {
        heading: "Cambios",
        body: [
          "Si modificamos esta política, actualizaremos la fecha en la parte superior. Si un cambio afecta de forma importante a cómo tratamos tu información, avisaremos por correo a los titulares de cuentas antes de que entre en vigor.",
        ],
      },
      {
        heading: "Contacto",
        body: [
          "Preguntas, solicitudes o reclamaciones: privacy@coursebridge.us.",
          "Esta política se publica en varios idiomas. Si hay alguna diferencia entre versiones, la versión en inglés es la que prevalece.",
        ],
      },
    ],
  },

  zh: {
    title: "隐私政策",
    updated: "最后更新：2026 年 8 月 12 日",
    intro:
      "本政策准确说明 CourseBridge 收集哪些信息、不收集哪些信息，以及还有谁能看到这些信息。内容与产品的实际运作方式一致。",
    sections: [
      {
        heading: "我们是谁",
        body: [
          "CourseBridge 由 [OPERATOR NAMES] 运营。我们是独立项目，与 ASSIST、加州大学、加州州立大学或任何社区学院均无隶属关系。",
          "有关本政策的任何问题，可发送邮件至 privacy@coursebridge.us。",
        ],
      },
      {
        heading: "我们收集哪些信息",
        body: [
          "如果你注册账号，我们会保存：",
          "- 你的电子邮箱地址；如果你使用密码注册，还会保存该密码的哈希值。我们绝不保存密码本身。",
          "- 你的姓名，以及你上传的头像（如有）。",
          "- 如果你使用 Google 登录，会保存你的 Google 账号标识。",
          "- 你所在的社区学院、意向专业以及目标校区。",
          "- 你的主题和语言偏好。",
          "当你生成计划时，我们会保存该计划，以及生成它所依据的学院、校区、专业和已修课程列表，方便你下次继续使用。",
          "如果你就某个计划或回复向我们提交反馈，我们会保存该反馈；如果你已登录，还会记录反馈来自哪个账号。",
          "我们会在内存中短暂保留你的 IP 地址，用于限制请求频率和防止滥用。该信息不会写入数据库。",
        ],
      },
      {
        heading: "我们不收集哪些信息",
        body: [
          "其中一些做法并不常见，值得明确说明。",
          "- 你上传的成绩单仅在内存中读取以提取课程代码，随后即被丢弃。该文件绝不会写入磁盘，也不会进入我们的数据库。",
          "- 与 CourseBridge AI 助手的对话不会被保存。每条消息都会发送给模型服务提供商以生成回复，之后我们不会存储。",
          "- 我们不使用分析工具或广告，本网站也没有任何跟踪 Cookie。",
          "- 我们不出售你的信息，也不会为广告目的共享这些信息。",
        ],
      },
      {
        heading: "Cookie 与浏览器存储",
        body: [
          "我们只使用一个 Cookie：用于保持登录状态的会话令牌。它是网站运行所必需的，因此我们不请求 Cookie 同意。",
          "你的浏览器还会在本地保存草稿资料、主题和语言设置，以便在注册账号前也能正常使用网站。这些数据保留在你的设备上，你可以随时通过浏览器设置清除。",
        ],
      },
      {
        heading: "还有谁能看到你的信息",
        body: [
          "我们使用少量服务提供商，且仅用于以下用途：",
          "- Groq，负责运行 AI 模型。你的消息以及你的学院、专业、目标校区和已修课程会发送给 Groq，以便生成有用的回答。",
          "- Google，仅在你选择使用 Google 登录时。",
          "- Resend，负责发送密码重置邮件。",
          "- Railway，负责托管应用和数据库。",
          "在法律要求的情况下，我们也可能披露信息。除此之外，不会有其他方获得你的数据。",
        ],
      },
      {
        heading: "保存多久",
        body: [
          "你的账号和已保存的计划会一直保留，直到你要求删除。会话令牌 30 天后过期，密码重置链接在签发后不久即失效。",
          "我们是测试阶段的产品，宁可少存也不多存。如果你的账号长期未使用，我们可能会将其删除，并会尽量提前通过邮件通知你。",
        ],
      },
      {
        heading: "你的选择",
        body: [
          "你可以随时在“设置”中查看和修改姓名、学院、目标校区、头像、主题和语言。",
          "如需获取数据副本、更正数据或删除数据，请使用账号邮箱发送邮件至 privacy@coursebridge.us。我们将在 30 天内处理删除请求，删除内容包括你的账号、已保存的计划和反馈。",
          "目前我们还没有自助删除按钮。在我们做出该功能之前，请通过邮件联系，我们一定会处理。",
        ],
      },
      {
        heading: "安全",
        body: [
          "密码经过哈希处理，网站通过 HTTPS 提供服务，会话 Cookie 设置为 HTTP-only，且每个账号只能读取自己的计划。",
          "没有任何服务能够承诺绝对安全，我们也不会假装可以。如果我们发现涉及你信息的数据泄露，将依法通知你和相关主管部门。",
        ],
      },
      {
        heading: "年龄",
        body: [
          "CourseBridge 面向 13 岁及以上的学生。我们不会在知情的情况下收集 13 岁以下儿童的信息。如果你认为有 13 岁以下儿童向我们提供了信息，请发邮件至 privacy@coursebridge.us，我们会予以删除。",
          "我们的部分用户未满 18 岁。如果你是其中之一，在使用本网站的同时，也请与家长、监护人或辅导员讨论你的转学计划。",
        ],
      },
      {
        heading: "服务地区",
        body: [
          "CourseBridge 面向加州社区学院学生打造，仅在美国提供服务。我们不面向欧盟或英国的用户。",
        ],
      },
      {
        heading: "政策变更",
        body: [
          "如果我们修改本政策，会更新顶部的日期。如果某项变更对我们处理你信息的方式有重大影响，我们会在生效前通过邮件通知账号持有者。",
        ],
      },
      {
        heading: "联系方式",
        body: [
          "问题、请求或投诉：privacy@coursebridge.us。",
          "本政策以多种语言发布。各版本如有差异，以英文版本为准。",
        ],
      },
    ],
  },
};

export default privacy;
