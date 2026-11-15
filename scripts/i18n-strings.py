# -*- coding: utf-8 -*-
import json, textwrap
from pathlib import Path

L = ["de","fr","it","es","pt","nl","tr","id","ru","ar","zh","ja","ko","hi"]

# key: (english, [de,fr,it,es,pt,nl,tr,id,ru,ar,zh,ja,ko,hi])
S = {
"nav.banking": ("Banking", ["Banking","Banque","Banca","Banca","Banco","Bankieren","Bankacılık","Perbankan","Банкинг","الخدمات المصرفية","银行业务","バンキング","뱅킹","बैंकिंग"]),
"nav.discover": ("Discover", ["Entdecken","Découvrir","Scopri","Descubrir","Descobrir","Ontdekken","Keşfet","Jelajahi","Обзор","استكشف","发现","見つける","둘러보기","जानें"]),
"nav.about": ("About", ["Über uns","À propos","Chi siamo","Sobre nosotros","Sobre","Over ons","Hakkında","Tentang","О нас","من نحن","关于我们","会社概要","회사 소개","हमारे बारे में"]),
"nav.help": ("Help", ["Hilfe","Aide","Assistenza","Ayuda","Ajuda","Hulp","Yardım","Bantuan","Помощь","المساعدة","帮助","ヘルプ","도움말","सहायता"]),
"nav.login": ("Log in", ["Anmelden","Se connecter","Accedi","Iniciar sesión","Entrar","Inloggen","Giriş yap","Masuk","Войти","تسجيل الدخول","登录","ログイン","로그인","लॉग इन"]),
"nav.getStarted": ("Get started", ["Jetzt starten","Commencer","Inizia","Empezar","Começar","Aan de slag","Başla","Mulai","Начать","ابدأ الآن","开始使用","はじめる","시작하기","शुरू करें"]),
"nav.logout": ("Log out", ["Abmelden","Se déconnecter","Esci","Cerrar sesión","Sair","Uitloggen","Çıkış yap","Keluar","Выйти","تسجيل الخروج","退出登录","ログアウト","로그아웃","लॉग आउट"]),
"nav.community": ("Community", ["Community","Communauté","Community","Comunidad","Comunidade","Community","Topluluk","Komunitas","Сообщество","المجتمع","社区","コミュニティ","커뮤니티","समुदाय"]),
"nav.careers": ("Careers", ["Karriere","Carrières","Lavora con noi","Empleo","Carreiras","Vacatures","Kariyer","Karier","Карьера","الوظائف","招贤纳士","採用情報","채용","करियर"]),
"nav.mobileApp": ("Mobile app", ["Mobile App","Application mobile","App mobile","App móvil","App móvel","Mobiele app","Mobil uygulama","Aplikasi mobile","Мобильное приложение","تطبيق الجوال","移动应用","モバイルアプリ","모바일 앱","मोबाइल ऐप"]),
"nav.helpCentre": ("Help centre", ["Hilfe-Center","Centre d'aide","Centro assistenza","Centro de ayuda","Centro de ajuda","Helpcentrum","Yardım merkezi","Pusat bantuan","Справочный центр","مركز المساعدة","帮助中心","ヘルプセンター","고객센터","सहायता केंद्र"]),
"nav.contact": ("Contact", ["Kontakt","Contact","Contatti","Contacto","Contacto","Contact","İletişim","Kontak","Контакты","اتصل بنا","联系我们","お問い合わせ","문의하기","संपर्क"]),
"nav.privacy": ("Privacy policy", ["Datenschutz","Confidentialité","Privacy","Privacidad","Privacidade","Privacybeleid","Gizlilik","Kebijakan privasi","Конфиденциальность","سياسة الخصوصية","隐私政策","プライバシー","개인정보 처리방침","गोपनीयता नीति"]),
"nav.legal": ("Legal information", ["Rechtliche Hinweise","Mentions légales","Note legali","Información legal","Informações legais","Juridische informatie","Yasal bilgiler","Informasi hukum","Правовая информация","المعلومات القانونية","法律信息","法的情報","법적 고지","कानूनी जानकारी"]),
"app.dashboard": ("Dashboard", ["Übersicht","Tableau de bord","Panoramica","Panel","Painel","Overzicht","Panel","Dasbor","Обзор","لوحة التحكم","概览","ダッシュボード","대시보드","डैशबोर्ड"]),
"app.accounts": ("Accounts", ["Konten","Comptes","Conti","Cuentas","Contas","Rekeningen","Hesaplar","Rekening","Счета","الحسابات","账户","口座","계좌","खाते"]),
"app.payments": ("Payments", ["Zahlungen","Paiements","Pagamenti","Pagos","Pagamentos","Betalingen","Ödemeler","Pembayaran","Платежи","المدفوعات","付款","支払い","결제","भुगतान"]),
"app.cards": ("Cards", ["Karten","Cartes","Carte","Tarjetas","Cartões","Kaarten","Kartlar","Kartu","Карты","البطاقات","银行卡","カード","카드","कार्ड"]),
"app.activity": ("Activity", ["Aktivität","Activité","Attività","Actividad","Atividade","Activiteit","Hareketler","Aktivitas","Операции","النشاط","交易记录","履歴","거래 내역","गतिविधि"]),
"app.payees": ("Payees", ["Empfänger","Bénéficiaires","Beneficiari","Beneficiarios","Beneficiários","Begunstigden","Alıcılar","Penerima","Получатели","المستفيدون","收款人","受取人","수취인","प्राप्तकर्ता"]),
"app.profile": ("Profile", ["Profil","Profil","Profilo","Perfil","Perfil","Profiel","Profil","Profil","Профиль","الملف الشخصي","个人资料","プロフィール","프로필","प्रोफ़ाइल"]),
"app.security": ("Security", ["Sicherheit","Sécurité","Sicurezza","Seguridad","Segurança","Beveiliging","Güvenlik","Keamanan","Безопасность","الأمان","安全","セキュリティ","보안","सुरक्षा"]),
"app.notifications": ("Notifications", ["Benachrichtigungen","Notifications","Notifiche","Notificaciones","Notificações","Meldingen","Bildirimler","Notifikasi","Уведомления","الإشعارات","通知","通知","알림","सूचनाएं"]),
"hero.title": ("A clearer way to |bank.|", ["Ein klarerer Weg zum |Banking.|","Une façon plus claire de |banker.|","Un modo più chiaro di |fare banking.|","Una forma más clara de |hacer banca.|","Uma forma mais clara de |fazer banking.|","Een helderdere manier van |bankieren.|","Daha net bir |bankacılık.|","Cara yang lebih jernih untuk |berbank.|","Более ясный подход к |банкингу.|","طريقة أوضح |لإدارة أموالك.|","更清晰的|银行体验。|","もっとわかりやすい|バンキング。|","더 명확한 |뱅킹.|","बैंकिंग का एक स्पष्ट |तरीका।|"]),
"hero.sub": ("A thoughtful place for your everyday money. See the whole picture, make your next move and get on with what matters.",
 ["Ein durchdachter Ort für Ihr Geld im Alltag. Behalten Sie den Überblick, machen Sie den nächsten Schritt und kümmern Sie sich um das, was zählt.",
  "Un endroit réfléchi pour votre argent au quotidien. Voyez l'ensemble, faites votre prochain pas et concentrez-vous sur l'essentiel.",
  "Un posto pensato per i tuoi soldi di ogni giorno. Guarda il quadro completo, fai il passo successivo e dedica tempo a ciò che conta.",
  "Un lugar cuidado para tu dinero del día a día. Ve el panorama completo, da tu siguiente paso y ocúpate de lo que importa.",
  "Um lugar pensado para o seu dinheiro do dia a dia. Veja o quadro completo, dê o próximo passo e ocupe-se do que importa.",
  "Een doordachte plek voor je dagelijkse geld. Zie het geheel, zet je volgende stap en ga verder met wat ertoe doet.",
  "Günlük paranız için düşünülmüş bir yer. Bütünü görün, bir sonraki adımınızı atın ve önemli olana odaklanın.",
  "Tempat yang dirancang untuk uang sehari-hari Anda. Lihat gambaran utuh, ambil langkah berikutnya, dan lanjutkan hal yang penting.",
  "Продуманное место для ваших повседневных денег. Видьте всю картину, делайте следующий шаг и занимайтесь тем, что важно.",
  "مكان مدروس لأموالك اليومية. شاهد الصورة كاملة، اتخذ خطوتك التالية، وتابع ما يهمك.",
  "一个为日常资金精心设计的地方。看清全貌，走好下一步，专注于真正重要的事。",
  "毎日のお金のための、考え抜かれた場所。全体像を見渡し、次の一歩を踏み出し、大切なことに時間を使えます。",
  "일상의 돈을 위한 세심한 공간. 전체를 살펴보고 다음 단계로 나아가 중요한 일에 집중하세요.",
  "आपके रोज़मर्रा के पैसे के लिए एक सोचा-समझा ठिकाना। पूरी तस्वीर देखें, अगला कदम उठाएँ और जो मायने रखता है उस पर ध्यान दें।"]),
"hero.ctaDemo": ("Explore the live demo", ["Live-Demo ansehen","Essayer la démo","Prova la demo","Ver la demo","Ver a demo","Bekijk de demo","Demoyu keşfet","Lihat demo","Открыть демо","استكشف العرض التجريبي","体验在线演示","デモを試す","데모 체험하기","लाइव डेमो देखें"]),
"hero.ctaRegister": ("Create an account", ["Konto eröffnen","Créer un compte","Crea un conto","Crear una cuenta","Criar conta","Account aanmaken","Hesap oluştur","Buat akun","Открыть счёт","إنشاء حساب","创建账户","アカウント作成","계정 만들기","खाता बनाएँ"]),
"hero.note": ("Try the sample account instantly. No sign-up needed.",
 ["Testen Sie das Beispielkonto sofort. Ohne Anmeldung.","Essayez le compte de démonstration immédiatement. Sans inscription.",
  "Prova subito il conto di esempio. Senza registrazione.","Prueba la cuenta de ejemplo al instante. Sin registro.",
  "Experimente a conta de exemplo de imediato. Sem registo.","Probeer direct het voorbeeldaccount. Zonder aanmelden.",
  "Örnek hesabı hemen deneyin. Kayıt gerekmez.","Coba akun contoh sekarang. Tanpa pendaftaran.",
  "Попробуйте демо-счёт сразу. Без регистрации.","جرّب الحساب التجريبي فورًا. دون تسجيل.",
  "即刻试用示例账户，无需注册。","サンプル口座をすぐにお試しいただけます。登録は不要です。",
  "샘플 계정을 바로 사용해 보세요. 가입은 필요 없습니다.","नमूना खाता तुरंत आज़माएँ। साइन-अप की ज़रूरत नहीं।"]),
"section.everyday": ("The everyday, a little easier.", ["Der Alltag, ein wenig leichter.","Le quotidien, un peu plus simple.","La quotidianità, un po' più semplice.","El día a día, un poco más fácil.","O dia a dia, um pouco mais simples.","Het dagelijks leven, net iets eenvoudiger.","Gündelik hayat, biraz daha kolay.","Keseharian, sedikit lebih mudah.","Повседневность — немного проще.","الحياة اليومية، أسهل قليلًا.","日常，从容一点。","毎日を、もう少しシンプルに。","일상이 조금 더 수월하게.","रोज़मर्रा, थोड़ा आसान।"]),
"section.accounts": ("One clear place for your money.", ["Ein klarer Ort für Ihr Geld.","Un endroit clair pour votre argent.","Un unico posto chiaro per i tuoi soldi.","Un lugar claro para tu dinero.","Um lugar claro para o seu dinheiro.","Eén heldere plek voor je geld.","Paranız için tek ve net bir yer.","Satu tempat yang jelas untuk uang Anda.","Одно понятное место для ваших денег.","مكان واحد واضح لأموالك.","一个清晰的地方，安放你的钱。","お金をまとめて見渡せる、明確な場所。","내 돈을 한눈에 보는 명확한 곳.","आपके पैसे के लिए एक स्पष्ट जगह।"]),
"section.insight": ("See what’s coming in and going out.", ["Sehen Sie, was kommt und was geht.","Voyez ce qui entre et ce qui sort.","Vedi cosa entra e cosa esce.","Mira lo que entra y lo que sale.","Veja o que entra e o que sai.","Zie wat er binnenkomt en wat er uitgaat.","Gelen ve giden parayı görün.","Lihat apa yang masuk dan keluar.","Смотрите, что приходит и что уходит.","اطّلع على ما يدخل وما يخرج.","看清每一笔进出。","入るお金と出るお金を見渡せます。","들어오고 나가는 돈을 확인하세요.","देखें क्या आ रहा है और क्या जा रहा है।"]),
"section.cards": ("Cards and payments, organised around you.", ["Karten und Zahlungen, auf Sie abgestimmt.","Cartes et paiements, pensés autour de vous.","Carte e pagamenti, organizzati intorno a te.","Tarjetas y pagos, organizados en torno a ti.","Cartões e pagamentos, organizados à sua volta.","Kaarten en betalingen, rond jou georganiseerd.","Kartlar ve ödemeler, size göre düzenlendi.","Kartu dan pembayaran, diatur sesuai Anda.","Карты и платежи — вокруг вас.","البطاقات والمدفوعات، منظّمة حولك.","卡片与付款，围绕你而组织。","カードも支払いも、あなたを中心に。","카드와 결제를 나 중심으로.","कार्ड और भुगतान, आपके अनुसार।"]),
"section.plans": ("Big plans deserve thoughtful choices.", ["Große Pläne verdienen durchdachte Entscheidungen.","Les grands projets méritent des choix réfléchis.","I grandi progetti meritano scelte ponderate.","Los grandes planes merecen decisiones meditadas.","Os grandes planos merecem escolhas ponderadas.","Grote plannen verdienen doordachte keuzes.","Büyük planlar düşünülmüş seçimler hak eder.","Rencana besar layak mendapat pilihan yang matang.","Большие планы достойны продуманных решений.","الخطط الكبيرة تستحق خيارات مدروسة.","宏大的计划，值得深思熟虑的选择。","大きな計画には、考え抜かれた選択を。","큰 계획에는 신중한 선택이 필요합니다.","बड़ी योजनाओं के लिए सोचे-समझे फैसले चाहिए।"]),
"section.mobile": ("Meridian in your pocket.", ["Meridian in Ihrer Tasche.","Meridian dans votre poche.","Meridian in tasca.","Meridian en tu bolsillo.","A Meridian no seu bolso.","Meridian in je zak.","Meridian cebinizde.","Meridian di saku Anda.","Meridian в вашем кармане.","ميريديان في جيبك.","Meridian 装进口袋。","Meridianをポケットに。","주머니 속의 Meridian.","आपकी जेब में Meridian।"]),
"section.steps": ("A simpler way to get going.", ["Ein einfacherer Weg zu starten.","Une façon plus simple de commencer.","Un modo più semplice per iniziare.","Una forma más sencilla de empezar.","Uma forma mais simples de começar.","Een eenvoudigere manier om te beginnen.","Başlamanın daha kolay yolu.","Cara yang lebih sederhana untuk memulai.","Более простой способ начать.","طريقة أبسط للبدء.","更简单的开始方式。","もっとシンプルにはじめる。","더 간단하게 시작하는 방법.","शुरू करने का आसान तरीका।"]),
"ui.recentActivity": ("Recent activity", ["Letzte Aktivitäten","Activité récente","Attività recenti","Actividad reciente","Atividade recente","Recente activiteit","Son hareketler","Aktivitas terbaru","Последние операции","النشاط الأخير","最近交易","最近の履歴","최근 거래","हाल की गतिविधि"]),
"ui.totalBalance": ("Total balance", ["Gesamtsaldo","Solde total","Saldo totale","Saldo total","Saldo total","Totaal saldo","Toplam bakiye","Saldo total","Общий баланс","الرصيد الإجمالي","总余额","総残高","총 잔액","कुल शेष"]),
"ui.viewAll": ("View all", ["Alle ansehen","Tout voir","Vedi tutto","Ver todo","Ver tudo","Alles bekijken","Tümünü gör","Lihat semua","Смотреть все","عرض الكل","查看全部","すべて見る","전체 보기","सभी देखें"]),
"ui.language": ("Language", ["Sprache","Langue","Lingua","Idioma","Idioma","Taal","Dil","Bahasa","Язык","اللغة","语言","言語","언어","भाषा"]),
"ui.transfer": ("Transfer", ["Überweisen","Virement","Bonifico","Transferencia","Transferência","Overschrijven","Transfer","Transfer","Перевод","تحويل","转账","振込","이체","ट्रांसफ़र"]),
"ui.openAccount": ("Open account", ["Konto eröffnen","Ouvrir un compte","Apri conto","Abrir cuenta","Abrir conta","Account openen","Hesap aç","Buka rekening","Открыть счёт","فتح حساب","开立账户","口座開設","계좌 개설","खाता खोलें"]),
"ui.statements": ("Statements", ["Auszüge","Relevés","Estratti conto","Extractos","Extratos","Afschriften","Ekstreler","Rekening koran","Выписки","الكشوف","对账单","明細書","명세서","विवरण"]),
"ui.search": ("Search", ["Suchen","Rechercher","Cerca","Buscar","Pesquisar","Zoeken","Ara","Cari","Поиск","بحث","搜索","検索","검색","खोजें"]),
}

out = ["// AUTO-GENERATED — edit `scripts/i18n-strings.py` and re-run, or edit here directly.",
       "// Source of truth for every translatable string. Keys are stable ids; `en` is the",
       "// English text that the DOM matcher looks for in the rendered page.",
       "",
       "export type Translation = { en: string } & Partial<Record<",
       '  "de" | "fr" | "it" | "es" | "pt" | "nl" | "tr" | "id" | "ru" | "ar" | "zh" | "ja" | "ko" | "hi",',
       "  string",
       ">>;",
       "",
       "export const STRINGS: Record<string, Translation> = {"]
for key, (en, vals) in S.items():
    assert len(vals) == len(L), (key, len(vals))
    out.append(f'  {json.dumps(key)}: {{')
    out.append(f'    en: {json.dumps(en, ensure_ascii=False)},')
    for loc, v in zip(L, vals):
        out.append(f'    {loc}: {json.dumps(v, ensure_ascii=False)},')
    out.append("  },")
out.append("};")
Path("/home/user/_work/src/lib/i18n/strings.ts").write_text("\n".join(out) + "\n")
print("keys:", len(S), "| locales:", len(L)+1, "| translations:", len(S)*len(L))
