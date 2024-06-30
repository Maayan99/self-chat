import {admins, client} from "../main";

async function notifyAdmins(message: string) {
    await Promise.all(admins.map(async (admin: string) => await client.sendMessage(message, admin)));
}

async function notifyAdminsError(message: string) {
    await notifyAdmins("🔴🔴🔴\n" + message + "\n🔴🔴🔴")
}

async function notifyAdminsAlert(message: string) {
    await notifyAdmins("🟠🟠🟠\n" + message + "\n🟠🟠🟠")
}


async function notifyAdminsUpdate(message: string) {
    await notifyAdmins("🟢🟢🟢\n" + message + "\n🟢🟢🟢")
}


async function notifyAdminsImage(caption: string, filename: string) {
    await Promise.all(admins.map(async (admin: string) =>
        await client.sendMedia(caption, filename, 'image', 'image/jpeg', admin)));
}

export {notifyAdminsImage, notifyAdminsAlert, notifyAdmins, notifyAdminsError, notifyAdminsUpdate}