const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');
const pino = require('pino');

// سيرفر ويب بسيط (يفيدك إذا قررت رفع الكود على سيرفر سحابي لاحقاً)
const app = express();
app.get('/', (req, res) => res.send('البوت شغال بنجاح وبدون متصفح كروم!'));
app.listen(3000, () => console.log('سيرفر الويب متصل'));

// مفتاح الذكاء الاصطناعي الخاص بك
const ai = new GoogleGenAI({ apiKey: 'AQ.Ab8RN6LtXMdXlB524tUY6mSgKi2iXnfVTvc64heHdo5w3XuHXA' });

async function startBot() {
    // حفظ بيانات الجلسة في مجلد auth_info لعدم طلب الباركود عند كل تشغيل
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // طباعة الباركود في التيرمينال
        logger: pino({ level: 'silent' }) // إبقاء الشاشة نظيفة من رسائل النظام المزعجة
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        if(update.connection === 'open') {
            console.log('تم الاتصال بالواتساب بنجاح! البوت شغال دلوقتي.');
        }
    });

    // استلام الرسائل والرد عليها
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        
        // تجاهل رسائل الجروبات، الحالات، ورسائل البوت نفسه
        if (!msg.message  msg.key.fromMe  msg.key.remoteJid.includes('@g.us') || msg.key.remoteJid === 'status@broadcast') return;

        // استخراج النص
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        try {
            const prompt = "أنت مساعد ذكي ومفيد. رد باللغة العربية فقط وبشكل طبيعي. رسالة المستخدم هي: " + text;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            // إرسال الرد
            await sock.sendMessage(msg.key.remoteJid, { text: response.text }, { quoted: msg });
            
        } catch (error) {
            console.error('حصلت مشكلة في الاتصال بالذكاء الاصطناعي:', error.message);
        }
    });
}

startBot();
