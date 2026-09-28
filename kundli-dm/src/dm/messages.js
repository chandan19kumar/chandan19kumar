// Every word the bot says, in one place (Hinglish, Roman script — what most
// Instagram users type). Edit freely; keep each message under 1000 characters.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDate = (d) => `${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
export const fmtTime = (t) => `${String(t.hour % 12 === 0 ? 12 : t.hour % 12).padStart(2, '0')}:${String(t.minute).padStart(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}`;

export const M = {
  askAll: () => ({
    text: 'Namaste 🙏 Aapki FREE janm kundli abhi banegi. Bas ye 4 details ek message me bhejiye:\n\n'
      + '👤 Naam\n📅 Janm tithi (jaise 12/03/1995)\n⏰ Janm samay (jaise 6:45 AM)\n📍 Janm sthan (shahar, rajya)\n\n'
      + 'Udaharan: Rahul Kumar, 12/03/1995, 6:45 AM, Patna Bihar\n\n'
      + '🔒 Aapki details sirf kundli banane ke liye use hongi.',
  }),
  askMissing: (missing) => {
    const label = { name: '👤 Naam', date: '📅 Janm tithi (jaise 12/03/1995)', time: '⏰ Janm samay (jaise 6:45 AM)', place: '📍 Janm sthan (shahar, rajya)' };
    return { text: `Dhanyavaad! Bas ye bataiye:\n\n${missing.map((m) => label[m]).join('\n')}` };
  },
  askAmPm: (t) => ({
    text: `⏰ ${t.hour}:${String(t.minute).padStart(2, '0')} — subah (AM) ya shaam/raat (PM)?`,
    quickReplies: [{ title: '🌅 AM (subah)', payload: 'AMPM_AM' }, { title: '🌙 PM (shaam/raat)', payload: 'AMPM_PM' }],
  }),
  choosePlace: (options) => ({
    text: `📍 Is naam ki ${options.length} jagah mili. Kaunsi hai? Number chuniye:\n\n${options.map((o, i) => `${i + 1}. ${o.longName || o.name}`).join('\n')}\n\nNa ho to rajya/zila ke saath likhiye (jaise "Aurangabad Bihar").`,
    quickReplies: options.slice(0, 9).map((o, i) => ({ title: `${i + 1}. ${(o.city || o.name).slice(0, 14)}`, payload: `PLACE_${i}` })),
  }),
  placeNotFound: (q) => ({
    text: `📍 "${q}" hamari list me nahi mila. Kripya najdeeki shahar ya zila ka naam rajya ke saath likhiye, jaise "Motihari, Bihar" ya "Purnia Bihar".`,
  }),
  badDate: () => ({ text: '📅 Janm tithi samajh nahi aayi. Kripya is tarah likhiye: 12/03/1995 ya 12 March 1995' }),
  confirm: (d) => ({
    text: `🙏 Kripya details check kijiye:\n\n👤 Naam: ${d.name}\n📅 Janm tithi: ${fmtDate(d.date)}\n⏰ Janm samay: ${fmtTime(d.time)}\n📍 Janm sthan: ${d.place.name}${d.dateAmbiguous ? `\n\nℹ️ ${String(d.date.day).padStart(2, '0')}/${String(d.date.month).padStart(2, '0')} ko humne ${fmtDate(d.date).replace(/ \d{4}$/, '')} maana hai.` : ''}${d.timeNote ? `\n\nℹ️ ${d.timeNote}` : ''}\n\nSab sahi hai?`,
    quickReplies: [{ title: '✅ Haan, sahi hai', payload: 'CONFIRM_YES' }, { title: '✏️ Badlna hai', payload: 'CONFIRM_NO' }],
  }),
  askCorrection: () => ({ text: '✏️ Theek hai. Jo galat hai sirf wahi sahi karke bhejiye (jaise "samay 7:15 PM" ya "sthan Gaya Bihar").' }),
  working: (name) => ({ text: `🔮 ${name} ji, aapki kundli ban rahi hai… bas kuch second.` }),
  ready: (name) => ({ text: `✨ ${name} ji, aapki janm kundli taiyaar hai! 4 pages 👇` }),
  report: (url) => ({
    text: `📖 Poori report (sabhi dasha-antardasha ke saath):\n${url}\n\n`
      + 'Grahon ki ganana Lahiri ayanamsa se hai, aur NASA JPL-aadharit Swiss Ephemeris se milaan karke jaanchi gayi hai.\n\n'
      + '🔮 Kundli ka vistaar se fal jaanne ke liye "consult" likhiye.',
  }),
  limit: (n) => ({ text: `🙏 Aaj ke liye ${n} kundli ho chuki hain. Kal fir try kijiye, ya vistaar se jaanne ke liye "consult" likhiye.` }),
  cancelled: () => ({ text: 'Theek hai 🙏 Jab chahein "kundli" likh kar dobara shuru kar sakte hain.' }),
  error: () => ({ text: '😔 Maaf kijiye, abhi kundli banane me dikkat aayi. Hamari team ko suchna mil gayi hai — thodi der me dobara "kundli" likhiye.' }),
  consult: (text) => ({ text }),
};
