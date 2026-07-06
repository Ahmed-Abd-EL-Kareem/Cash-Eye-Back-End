# Rahal API

This project was developed by our team as a final project during the ITI trainee program. We worked together to build a complete backend system for hotel booking, travel planning, payments, authentication, and AI-powered features.

---

## English

### Project Overview
Rahal API is a backend application for a hotel booking and travel experience platform. It provides APIs for users, hotels, destinations, bookings, payments, subscriptions, trips, and AI-based services.

### Main Features
- User authentication and authorization
- Hotel and destination management
- Booking and payment processing
- Subscription plans and upgrade flow
- AI-powered hotel search and recommendations
- Trip planning support
- Secure middleware and validation

### Technologies Used
- Node.js
- Express.js
- MongoDB
- JWT and Passport
- Stripe for payments
- OpenAI / AI integrations
- Helmet, CORS, compression, rate limiting, and sanitization middleware

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your environment variables in a `.env` or `.development.env` file.
3. Run the project:
   ```bash
   npm run dev
   ```
4. Seed the database:
   ```bash
   npm run seed
   ```

### Project Structure
- `src/config` — project configuration and environment setup
- `src/modules` — main application modules such as auth, hotels, bookings, payments, subscriptions, trips, and users
- `src/integrations/ai` — AI services and integrations
- `src/middleware` — authentication, validation, error handling, and security middleware
- `src/utils` — shared helpers and utilities
- `src/seed` — seed data for initial setup

### Team Members
We worked on this project as a team for our final project at ITI.

- Ahmed Ayman — Team Leader, project structure management, GitHub management, AI part implementation, bug fixing, code reviewer, and ClickUp task management
- Ameen Salah
- Mostafa Mohamed
- Hala AbdElhameed
- Salma Ahmed
- Hager AbdElatif

---

## العربية

# Rahal API

تم تطوير هذا المشروع من خلال فريقنا كمشروع نهائي خلال برنامج ITI Training. عملنا معًا على بناء نظام backend كامل لخدمات الحجز الفندقي، والتخطيط للسفر، والدفع، والمصادقة، والميزات المدعومة بالذكاء الاصطناعي.

### نظرة عامة على المشروع
Rahal API هو تطبيق Backend لمنصة لحجز الفنادق وتجربة السفر. يوفر واجهات برمجية للمستخدمين والفنادق والوجهات والحجوزات والمدفوعات والاشتراكات والرحلات والخدمات القائمة على الذكاء الاصطناعي.

### الميزات الرئيسية
- تسجيل الدخول والمصادقة والترخيص
- إدارة الفنادق والوجهات
- معالجة الحجوزات والمدفوعات
- خطط الاشتراك وسير العمل الخاص بالترقية
- بحث وتوصيات فنادق مدعومة بالذكاء الاصطناعي
- دعم تخطيط الرحلات
- Middleware آمن والتحقق من صحة البيانات

### التقنيات المستخدمة
- Node.js
- Express.js
- MongoDB
- JWT و Passport
- Stripe للدفع
- OpenAI وال integrations الخاصة بالذكاء الاصطناعي
- Helmet و CORS و compression و rate limiting و middleware الخاصة بالتنظيف والتصفية

### التثبيت والتشغيل
1. تثبيت الحزم:
   ```bash
   npm install
   ```
2. قم بإعداد متغيرات البيئة في ملف `.env` أو `.development.env`.
3. تشغيل المشروع:
   ```bash
   npm run dev
   ```
4. تحميل البيانات الأساسية:
   ```bash
   npm run seed
   ```

### هيكل المشروع
- `src/config` — إعدادات المشروع ومتغيرات البيئة
- `src/modules` — الوحدات الأساسية مثل المصادقة، الفنادق، الحجوزات، المدفوعات، الاشتراكات، الرحلات، والمستخدمين
- `src/integrations/ai` — خدمات ودمجات الذكاء الاصطناعي
- `src/middleware` — الوسائط الخاصة بالمصادقة والتحقق والمعالجة والأمان
- `src/utils` — الأدوات والمساعدات المشتركة
- `src/seed` — بيانات أولية لإعداد المشروع

### أعضاء الفريق
عملنا على هذا المشروع كفريق كمشروع نهائي في ITI.

- أحمد أيمن — قائد الفريق، إدارة هيكل المشروع، إدارة GitHub، تنفيذ جزء الذكاء الاصطناعي، إصلاح الأخطاء، مراجعة الكود، وإدارة مهام ClickUp
- أمين صلاح
- مصطفي محمد
- هالة عبد الحميد
- سلمى أحمد
- هاجر عبد اللطيف

---

## Notes
This README includes both English and Arabic sections for easy understanding and presentation.
