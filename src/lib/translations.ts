export type Language = "en" | "th";

export const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    inventory: "Inventory",
    import: "Import",
    myStore: "My Store",
    marketplace: "Marketplace",
    network: "Network",
    staff: "Staff",
    settings: "Settings",
    logout: "Logout",
    salesReport: "Sales Report",
    auditLog: "Audit Log",
    
    // Auth
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    signIn: "Sign In",
    signUp: "Sign Up",
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    enterEmail: "Enter your email",
    enterPassword: "Enter your password",
    enterFullName: "Enter your full name",
    signInToAccess: "Sign in to access your tire inventory",
    joinNetwork: "Join the tire business network",
    noAccount: "Don't have an account? Sign up",
    hasAccount: "Already have an account? Sign in",
    termsAgreement: "By continuing, you agree to our Terms of Service and Privacy Policy",
    back: "Back",
    
    // Landing
    tagline: "The Premier Tire Business Network",
    stockManagement: "Stock Management System",
    businessFirst: "Business First, always.",
    heroDescription: "A comprehensive tire inventory management platform with network sharing, real-time stock tracking, and seamless B2B connections.",
    getStarted: "Get Started",
    learnMore: "Learn More",
    features: "Features",
    about: "About",
    member: "Member",
    join: "Join",
    
    // Features
    inventoryManagement: "Inventory Management",
    inventoryDesc: "Track stock levels, DOT codes, and pricing in real-time.",
    networkSharing: "Network Sharing",
    networkDesc: "Share inventory with partners and access their stock.",
    salesAnalytics: "Sales Analytics",
    analyticsDesc: "Insights into best sellers and business performance.",
    securePlatform: "Secure Platform",
    secureDesc: "Enterprise-grade security with role-based access.",
    
    // CTA
    readyToTransform: "Ready to Transform Your Tire Business?",
    joinNetworkCTA: "Join the BAANAKE network today and connect with other tire businesses in your area.",
    joinBaanake: "Join BAANAKE",
    
    // Footer
    allRightsReserved: "All rights reserved.",
    
    // Pending
    accountPending: "Account Pending Approval",
    pendingDescription: "Your account is being reviewed by our team. You'll be notified once approved.",
    whatHappensNext: "What happens next?",
    moderatorsReview: "Our moderators will review your application",
    usuallyTakes: "This usually takes 24-48 hours",
    receiveAccess: "You'll receive access once approved",
    checkStatus: "Check Status",
    signOut: "Sign Out",
    
    // Dashboard
    welcomeUser: "Welcome back",
    todayOverview: "Today's Overview",
    totalTires: "Total Tires",
    totalStock: "Total Stock",
    lowStock: "Low Stock",
    sharedItems: "Shared Items",
    quickActions: "Quick Actions",
    recentActivity: "Recent Activity",
    stockMovement: "Stock Movement",
    
    // Settings
    profile: "Profile",
    storeInfo: "Store Information",
    language: "Language",
    english: "English",
    thai: "ไทย",
    
    // Common
    search: "Search",
    filter: "Filter",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    noResults: "No results found",
    
    // Staff Management
    staffRequests: "Staff Requests",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    permissions: "Permissions",
    editPermissions: "Edit Permissions",
    
    // LINE Integration
    lineIntegration: "LINE Integration",
    linkLine: "Link LINE Account",
    unlinkLine: "Disconnect LINE",
    lineLinked: "Connected",
    lineNotLinked: "Not Connected",
    
    // LINE Webhook Setup
    webhookUrl: "Webhook URL",
    copyUrl: "Copy URL",
    urlCopied: "URL Copied!",
    lineSetupInstructions: "Setup Instructions",
    lineSetupStep1: "Go to LINE Developers Console",
    lineSetupStep2: "Select your Messaging API channel",
    lineSetupStep3: "Paste the Webhook URL in settings",
    lineSetupStep4: "Enable 'Use webhook'",
    lineSetupStep5: "Disable 'Auto-reply messages'",
    ownerVerification: "Owner Identity Verification",
    verifyOwnerIdentity: "Verify My Owner Identity",
    ownerVerified: "Verified",
    ownerNotVerified: "Not Verified",
    ownerVerificationDesc: "Link your LINE account to receive staff alerts and admin access.",
    sendCodeToShop: "Send this code to our Shop's LINE Official Account to link your account",
    viewStock: "View Stock",
    adjustStock: "Adjust Stock",
    // Phase UI
    webhookStatus: "Connection Status",
    webhookWaiting: "Waiting for webhook verification...",
    webhookConnected: "Webhook Connected",
    webhookTestInstructions: "After saving in LINE Developers Console, we'll detect the connection automatically.",
    phase1Title: "Step 1: Connect LINE Channel",
    phase2Title: "Step 2: Verify Owner Identity",
    phase2Locked: "Connect your LINE channel first to unlock this step.",
    phase3Complete: "Setup Complete!",
    // Save credentials
    saveLineSettings: "Save LINE Settings",
    savingLineSettings: "Saving...",
    lineSettingsSaved: "✓ Saved",
    webhookUrlHidden: "Webhook URL will appear after saving credentials",
  },
  th: {
    // Navigation
    dashboard: "แดชบอร์ด",
    inventory: "คลังสินค้า",
    import: "นำเข้า",
    myStore: "ร้านของฉัน",
    marketplace: "ตลาด",
    network: "เครือข่าย",
    staff: "พนักงาน",
    settings: "ตั้งค่า",
    logout: "ออกจากระบบ",
    salesReport: "รายงานการขาย",
    auditLog: "บันทึกการตรวจสอบ",
    
    // Auth
    welcomeBack: "ยินดีต้อนรับกลับ",
    createAccount: "สร้างบัญชี",
    signIn: "เข้าสู่ระบบ",
    signUp: "สมัครสมาชิก",
    email: "อีเมล",
    password: "รหัสผ่าน",
    fullName: "ชื่อ-นามสกุล",
    enterEmail: "กรอกอีเมลของคุณ",
    enterPassword: "กรอกรหัสผ่านของคุณ",
    enterFullName: "กรอกชื่อ-นามสกุลของคุณ",
    signInToAccess: "เข้าสู่ระบบเพื่อจัดการคลังยางของคุณ",
    joinNetwork: "เข้าร่วมเครือข่ายธุรกิจยาง",
    noAccount: "ยังไม่มีบัญชี? สมัครสมาชิก",
    hasAccount: "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ",
    termsAgreement: "การดำเนินการต่อถือว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว",
    back: "กลับ",
    
    // Landing
    tagline: "เครือข่ายธุรกิจยางชั้นนำ",
    stockManagement: "ระบบจัดการ STOCK",
    businessFirst: "ธุรกิจมาก่อน เสมอ",
    heroDescription: "แพลตฟอร์มจัดการคลังยางครบวงจร พร้อมระบบแชร์เครือข่าย ติดตามสต็อกแบบเรียลไทม์ และการเชื่อมต่อ B2B อย่างราบรื่น",
    getStarted: "เริ่มต้นใช้งาน",
    learnMore: "เรียนรู้เพิ่มเติม",
    features: "คุณสมบัติ",
    about: "เกี่ยวกับเรา",
    member: "สมาชิก",
    join: "เข้าร่วม",
    
    // Features
    inventoryManagement: "จัดการคลังสินค้า",
    inventoryDesc: "ติดตามระดับสต็อก รหัส DOT และราคาแบบเรียลไทม์",
    networkSharing: "แชร์เครือข่าย",
    networkDesc: "แชร์คลังสินค้ากับพาร์ทเนอร์และเข้าถึงสต็อกของพวกเขา",
    salesAnalytics: "วิเคราะห์การขาย",
    analyticsDesc: "ข้อมูลเชิงลึกเกี่ยวกับสินค้าขายดีและผลการดำเนินงาน",
    securePlatform: "แพลตฟอร์มปลอดภัย",
    secureDesc: "ความปลอดภัยระดับองค์กรพร้อมการควบคุมสิทธิ์ตามบทบาท",
    
    // CTA
    readyToTransform: "พร้อมที่จะเปลี่ยนแปลงธุรกิจยางของคุณ?",
    joinNetworkCTA: "เข้าร่วมเครือข่าย BAANAKE วันนี้ และเชื่อมต่อกับธุรกิจยางอื่นๆ ในพื้นที่ของคุณ",
    joinBaanake: "เข้าร่วม BAANAKE",
    
    // Footer
    allRightsReserved: "สงวนลิขสิทธิ์",
    
    // Pending
    accountPending: "บัญชีรอการอนุมัติ",
    pendingDescription: "บัญชีของคุณกำลังได้รับการตรวจสอบจากทีมงาน เราจะแจ้งให้คุณทราบเมื่อได้รับการอนุมัติ",
    whatHappensNext: "ขั้นตอนต่อไป?",
    moderatorsReview: "ผู้ดูแลระบบจะตรวจสอบใบสมัครของคุณ",
    usuallyTakes: "โดยปกติใช้เวลา 24-48 ชั่วโมง",
    receiveAccess: "คุณจะได้รับสิทธิ์เข้าใช้งานเมื่อได้รับการอนุมัติ",
    checkStatus: "ตรวจสอบสถานะ",
    signOut: "ออกจากระบบ",
    
    // Dashboard
    welcomeUser: "ยินดีต้อนรับกลับ",
    todayOverview: "ภาพรวมวันนี้",
    totalTires: "ยางทั้งหมด",
    totalStock: "สต็อกทั้งหมด",
    lowStock: "สต็อกต่ำ",
    sharedItems: "รายการที่แชร์",
    quickActions: "การดำเนินการด่วน",
    recentActivity: "กิจกรรมล่าสุด",
    stockMovement: "ความเคลื่อนไหวสต็อก",
    
    // Settings
    profile: "โปรไฟล์",
    storeInfo: "ข้อมูลร้านค้า",
    language: "ภาษา",
    english: "English",
    thai: "ไทย",
    
    // Common
    search: "ค้นหา",
    filter: "กรอง",
    add: "เพิ่ม",
    edit: "แก้ไข",
    delete: "ลบ",
    save: "บันทึก",
    cancel: "ยกเลิก",
    loading: "กำลังโหลด...",
    noResults: "ไม่พบผลลัพธ์",
    
    // Staff Management
    staffRequests: "คำขอเข้าร่วม",
    pending: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ปฏิเสธ",
    permissions: "สิทธิ์",
    editPermissions: "แก้ไขสิทธิ์",
    
    // LINE Integration
    lineIntegration: "เชื่อมต่อ LINE",
    linkLine: "เชื่อมต่อบัญชี LINE",
    unlinkLine: "ยกเลิกการเชื่อมต่อ",
    lineLinked: "เชื่อมต่อแล้ว",
    lineNotLinked: "ยังไม่เชื่อมต่อ",
    
    // LINE Webhook Setup
    webhookUrl: "Webhook URL",
    copyUrl: "คัดลอก URL",
    urlCopied: "คัดลอกแล้ว!",
    lineSetupInstructions: "คู่มือการตั้งค่า",
    lineSetupStep1: "ไปที่ LINE Developers Console",
    lineSetupStep2: "เลือก Messaging API channel ของคุณ",
    lineSetupStep3: "วาง Webhook URL ในการตั้งค่า",
    lineSetupStep4: "เปิดใช้งาน 'Use webhook'",
    lineSetupStep5: "ปิดใช้งาน 'Auto-reply messages'",
    ownerVerification: "ยืนยันตัวตนเจ้าของร้าน",
    verifyOwnerIdentity: "ยืนยันตัวตนเจ้าของร้าน",
    ownerVerified: "ยืนยันแล้ว",
    ownerNotVerified: "ยังไม่ยืนยัน",
    ownerVerificationDesc: "เชื่อมต่อ LINE เพื่อรับแจ้งเตือนพนักงานและการเข้าถึงแบบผู้ดูแล",
    sendCodeToShop: "ส่งรหัสนี้ไปยัง LINE Official Account ของร้านเพื่อเชื่อมต่อบัญชี",
    viewStock: "ดูสต็อก",
    adjustStock: "ปรับสต็อก",
    // Phase UI
    webhookStatus: "สถานะการเชื่อมต่อ",
    webhookWaiting: "รอการยืนยัน webhook...",
    webhookConnected: "เชื่อมต่อ Webhook แล้ว",
    webhookTestInstructions: "หลังจากบันทึกใน LINE Developers Console ระบบจะตรวจจับการเชื่อมต่อโดยอัตโนมัติ",
    phase1Title: "ขั้นตอนที่ 1: เชื่อมต่อ LINE Channel",
    phase2Title: "ขั้นตอนที่ 2: ยืนยันตัวตนเจ้าของร้าน",
    phase2Locked: "เชื่อมต่อ LINE Channel ก่อนเพื่อปลดล็อกขั้นตอนนี้",
    phase3Complete: "ตั้งค่าเสร็จสมบูรณ์!",
    // Save credentials
    saveLineSettings: "บันทึกการตั้งค่า LINE",
    savingLineSettings: "กำลังบันทึก...",
    lineSettingsSaved: "✓ บันทึกแล้ว",
    webhookUrlHidden: "URL Webhook จะปรากฏหลังจากบันทึกข้อมูล",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
