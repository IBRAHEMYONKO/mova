"use strict";

const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const config = require("./config.json");

const PORT = process.env.PORT || 3000;
const app = express();

/* =========================
   Discord Bot
========================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

/* =========================
   حماية الملفات
========================= */

app.use((req, res, next) => {
    const blocked = [
        "/config.json",
        "/package.json",
        "/package-lock.json",
        "/bot.js"
    ];

    if (blocked.includes(req.path)) {
        return res.status(403).send("Forbidden");
    }

    next();
});

/* =========================
   الموقع
========================= */

app.use(express.static(__dirname));

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        name: "NOVA CINEMA"
    });
});

/* =========================
   تشغيل الموقع
========================= */

const server = app.listen(PORT, () => {
    console.log("");
    console.log("================================");
    console.log("NOVA CINEMA WEBSITE ONLINE");
    console.log(`PORT → ${PORT}`);
    console.log("================================");
    console.log("");
});

/* =========================
   أخطاء الموقع
========================= */

server.on("error", error => {
    console.error(
        "WEBSITE SERVER ERROR:",
        error.message
    );
});

/* =========================
   Discord
========================= */

client.once("clientReady", () => {
    console.log(
        `NOVA CINEMA BOT ONLINE → ${client.user.tag}`
    );

    console.log(
        `BOT ID → ${client.user.id}`
    );
});

client.on("error", error => {
    console.error(
        "DISCORD ERROR:",
        error.message
    );
});

/* =========================
   تشغيل البوت
========================= */

async function startBot() {
    if (
        !config.token ||
        config.token === "ضع_توكن_البوت_هنا"
    ) {
        console.error(
            "ضع توكن البوت داخل config.json أولاً."
        );
        return;
    }

    try {
        await client.login(config.token);
    } catch (error) {
        console.error(
            "BOT LOGIN ERROR:",
            error.message
        );
    }
}

/* =========================
   التشغيل
========================= */

startBot();