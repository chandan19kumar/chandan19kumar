// Jyotish reference tables. Index 0 = Mesha/Aries, Ashwini, Sun, etc.
// Every table here is classical (BPHS / standard panchang convention) and is
// exercised by test/tables.test.js so a typo shows up as a failing test.

export const SIGNS = [
  { en: 'Aries', hi: 'मेष', lord: 'Mars', tatva: 'Fire', varna: 'Kshatriya' },
  { en: 'Taurus', hi: 'वृषभ', lord: 'Venus', tatva: 'Earth', varna: 'Vaishya' },
  { en: 'Gemini', hi: 'मिथुन', lord: 'Mercury', tatva: 'Air', varna: 'Shudra' },
  { en: 'Cancer', hi: 'कर्क', lord: 'Moon', tatva: 'Water', varna: 'Brahmin' },
  { en: 'Leo', hi: 'सिंह', lord: 'Sun', tatva: 'Fire', varna: 'Kshatriya' },
  { en: 'Virgo', hi: 'कन्या', lord: 'Mercury', tatva: 'Earth', varna: 'Vaishya' },
  { en: 'Libra', hi: 'तुला', lord: 'Venus', tatva: 'Air', varna: 'Shudra' },
  { en: 'Scorpio', hi: 'वृश्चिक', lord: 'Mars', tatva: 'Water', varna: 'Brahmin' },
  { en: 'Sagittarius', hi: 'धनु', lord: 'Jupiter', tatva: 'Fire', varna: 'Kshatriya' },
  { en: 'Capricorn', hi: 'मकर', lord: 'Saturn', tatva: 'Earth', varna: 'Vaishya' },
  { en: 'Aquarius', hi: 'कुंभ', lord: 'Saturn', tatva: 'Air', varna: 'Shudra' },
  { en: 'Pisces', hi: 'मीन', lord: 'Jupiter', tatva: 'Water', varna: 'Brahmin' },
];

// 27 nakshatras, 13°20' each. lord = Vimshottari lord. syllables = naamakshar per pada.
export const NAKSHATRAS = [
  { en: 'Ashwini', hi: 'अश्विनी', lord: 'Ketu', gana: 'Deva', yoni: 'Horse', syllables: ['चू', 'चे', 'चो', 'ला'] },
  { en: 'Bharani', hi: 'भरणी', lord: 'Venus', gana: 'Manushya', yoni: 'Elephant', syllables: ['ली', 'लू', 'ले', 'लो'] },
  { en: 'Krittika', hi: 'कृत्तिका', lord: 'Sun', gana: 'Rakshasa', yoni: 'Sheep', syllables: ['अ', 'ई', 'उ', 'ए'] },
  { en: 'Rohini', hi: 'रोहिणी', lord: 'Moon', gana: 'Manushya', yoni: 'Serpent', syllables: ['ओ', 'वा', 'वी', 'वू'] },
  { en: 'Mrigashira', hi: 'मृगशिरा', lord: 'Mars', gana: 'Deva', yoni: 'Serpent', syllables: ['वे', 'वो', 'का', 'की'] },
  { en: 'Ardra', hi: 'आर्द्रा', lord: 'Rahu', gana: 'Manushya', yoni: 'Dog', syllables: ['कु', 'घ', 'ङ', 'छ'] },
  { en: 'Punarvasu', hi: 'पुनर्वसु', lord: 'Jupiter', gana: 'Deva', yoni: 'Cat', syllables: ['के', 'को', 'हा', 'ही'] },
  { en: 'Pushya', hi: 'पुष्य', lord: 'Saturn', gana: 'Deva', yoni: 'Sheep', syllables: ['हु', 'हे', 'हो', 'डा'] },
  { en: 'Ashlesha', hi: 'आश्लेषा', lord: 'Mercury', gana: 'Rakshasa', yoni: 'Cat', syllables: ['डी', 'डू', 'डे', 'डो'] },
  { en: 'Magha', hi: 'मघा', lord: 'Ketu', gana: 'Rakshasa', yoni: 'Rat', syllables: ['मा', 'मी', 'मू', 'मे'] },
  { en: 'Purva Phalguni', hi: 'पूर्वा फाल्गुनी', lord: 'Venus', gana: 'Manushya', yoni: 'Rat', syllables: ['मो', 'टा', 'टी', 'टू'] },
  { en: 'Uttara Phalguni', hi: 'उत्तरा फाल्गुनी', lord: 'Sun', gana: 'Manushya', yoni: 'Cow', syllables: ['टे', 'टो', 'पा', 'पी'] },
  { en: 'Hasta', hi: 'हस्त', lord: 'Moon', gana: 'Deva', yoni: 'Buffalo', syllables: ['पू', 'ष', 'ण', 'ठ'] },
  { en: 'Chitra', hi: 'चित्रा', lord: 'Mars', gana: 'Rakshasa', yoni: 'Tiger', syllables: ['पे', 'पो', 'रा', 'री'] },
  { en: 'Swati', hi: 'स्वाती', lord: 'Rahu', gana: 'Deva', yoni: 'Buffalo', syllables: ['रू', 'रे', 'रो', 'ता'] },
  { en: 'Vishakha', hi: 'विशाखा', lord: 'Jupiter', gana: 'Rakshasa', yoni: 'Tiger', syllables: ['ती', 'तू', 'ते', 'तो'] },
  { en: 'Anuradha', hi: 'अनुराधा', lord: 'Saturn', gana: 'Deva', yoni: 'Deer', syllables: ['ना', 'नी', 'नू', 'ने'] },
  { en: 'Jyeshtha', hi: 'ज्येष्ठा', lord: 'Mercury', gana: 'Rakshasa', yoni: 'Deer', syllables: ['नो', 'या', 'यी', 'यू'] },
  { en: 'Mula', hi: 'मूल', lord: 'Ketu', gana: 'Rakshasa', yoni: 'Dog', syllables: ['ये', 'यो', 'भा', 'भी'] },
  { en: 'Purva Ashadha', hi: 'पूर्वाषाढ़ा', lord: 'Venus', gana: 'Manushya', yoni: 'Monkey', syllables: ['भू', 'धा', 'फा', 'ढा'] },
  { en: 'Uttara Ashadha', hi: 'उत्तराषाढ़ा', lord: 'Sun', gana: 'Manushya', yoni: 'Mongoose', syllables: ['भे', 'भो', 'जा', 'जी'] },
  { en: 'Shravana', hi: 'श्रवण', lord: 'Moon', gana: 'Deva', yoni: 'Monkey', syllables: ['खी', 'खू', 'खे', 'खो'] },
  { en: 'Dhanishta', hi: 'धनिष्ठा', lord: 'Mars', gana: 'Rakshasa', yoni: 'Lion', syllables: ['गा', 'गी', 'गु', 'गे'] },
  { en: 'Shatabhisha', hi: 'शतभिषा', lord: 'Rahu', gana: 'Rakshasa', yoni: 'Horse', syllables: ['गो', 'सा', 'सी', 'सू'] },
  { en: 'Purva Bhadrapada', hi: 'पूर्वा भाद्रपद', lord: 'Jupiter', gana: 'Manushya', yoni: 'Lion', syllables: ['से', 'सो', 'दा', 'दी'] },
  { en: 'Uttara Bhadrapada', hi: 'उत्तरा भाद्रपद', lord: 'Saturn', gana: 'Manushya', yoni: 'Cow', syllables: ['दू', 'थ', 'झ', 'ञ'] },
  { en: 'Revati', hi: 'रेवती', lord: 'Mercury', gana: 'Deva', yoni: 'Elephant', syllables: ['दे', 'दो', 'चा', 'ची'] },
];

// Nadi repeats Adi, Madhya, Antya, Antya, Madhya, Adi across the 27.
export const NADI_CYCLE = ['Adi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi'];
export const nadiOf = (nakIndex) => NADI_CYCLE[nakIndex % 6];

export const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
export const PLANET_NAMES = {
  Sun: { hi: 'सूर्य', short: 'सू', en: 'Sun', abbr: 'Su' },
  Moon: { hi: 'चंद्र', short: 'चं', en: 'Moon', abbr: 'Mo' },
  Mars: { hi: 'मंगल', short: 'मं', en: 'Mars', abbr: 'Ma' },
  Mercury: { hi: 'बुध', short: 'बु', en: 'Mercury', abbr: 'Me' },
  Jupiter: { hi: 'गुरु', short: 'गु', en: 'Jupiter', abbr: 'Ju' },
  Venus: { hi: 'शुक्र', short: 'शु', en: 'Venus', abbr: 'Ve' },
  Saturn: { hi: 'शनि', short: 'श', en: 'Saturn', abbr: 'Sa' },
  Rahu: { hi: 'राहु', short: 'रा', en: 'Rahu', abbr: 'Ra' },
  Ketu: { hi: 'केतु', short: 'के', en: 'Ketu', abbr: 'Ke' },
};

// Dignity (BPHS). Signs are 0-based. Moolatrikona ranges are degrees within that sign.
export const DIGNITY = {
  Sun: { exalt: 0, debil: 6, own: [4], mt: { sign: 4, from: 0, to: 20 } },
  Moon: { exalt: 1, debil: 7, own: [3], mt: { sign: 1, from: 3, to: 30 } },
  Mars: { exalt: 9, debil: 3, own: [0, 7], mt: { sign: 0, from: 0, to: 12 } },
  Mercury: { exalt: 5, debil: 11, own: [2, 5], mt: { sign: 5, from: 15, to: 20 } },
  Jupiter: { exalt: 3, debil: 9, own: [8, 11], mt: { sign: 8, from: 0, to: 10 } },
  Venus: { exalt: 11, debil: 5, own: [1, 6], mt: { sign: 6, from: 0, to: 15 } },
  Saturn: { exalt: 6, debil: 0, own: [9, 10], mt: { sign: 10, from: 0, to: 20 } },
};
// For Moon in Taurus and Mercury in Virgo the exaltation sign is also the
// moolatrikona/own sign; exaltation holds only up to these degrees.
export const EXALT_UPTO = { Moon: 3, Mercury: 15 };

// Naisargika (natural) relationships, BPHS.
export const RELATIONS = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'] },
  Moon: { friends: ['Sun', 'Mercury'], enemies: [] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'] },
  Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'] },
  Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'] },
};

// Combustion orbs from the Sun (Surya Siddhanta). [direct, retrograde]
export const COMBUST_ORB = {
  Moon: [12, 12], Mars: [17, 17], Mercury: [14, 12], Jupiter: [11, 11], Venus: [10, 8], Saturn: [15, 15],
};

// Vimshottari: order and years.
export const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
export const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

export const TITHIS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];
export const TITHIS_HI = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी',
  'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी',
];
export const YOGAS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];
export const YOGAS_HI = [
  'विष्कम्भ', 'प्रीति', 'आयुष्मान', 'सौभाग्य', 'शोभन', 'अतिगण्ड', 'सुकर्मा', 'धृति', 'शूल',
  'गण्ड', 'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र', 'सिद्धि', 'व्यतीपात', 'वरीयान',
  'परिघ', 'शिव', 'सिद्ध', 'साध्य', 'शुभ', 'शुक्ल', 'ब्रह्म', 'इन्द्र', 'वैधृति',
];
export const KARANAS_MOVABLE = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti'];
export const KARANAS_MOVABLE_HI = ['बव', 'बालव', 'कौलव', 'तैतिल', 'गर', 'वणिज', 'विष्टि'];
export const KARANAS_FIXED = { 1: ['Kimstughna', 'किंस्तुघ्न'], 58: ['Shakuni', 'शकुनि'], 59: ['Chatushpada', 'चतुष्पद'], 60: ['Naga', 'नाग'] };
export const VAARS = [
  ['Ravivar', 'रविवार', 'Sun'], ['Somvar', 'सोमवार', 'Moon'], ['Mangalvar', 'मंगलवार', 'Mars'],
  ['Budhvar', 'बुधवार', 'Mercury'], ['Guruvar', 'गुरुवार', 'Jupiter'], ['Shukravar', 'शुक्रवार', 'Venus'],
  ['Shanivar', 'शनिवार', 'Saturn'],
];

export const HI = {
  Deva: 'देव', Manushya: 'मनुष्य', Rakshasa: 'राक्षस',
  Adi: 'आदि', Madhya: 'मध्य', Antya: 'अन्त्य',
  Brahmin: 'ब्राह्मण', Kshatriya: 'क्षत्रिय', Vaishya: 'वैश्य', Shudra: 'शूद्र',
  Fire: 'अग्नि', Earth: 'पृथ्वी', Air: 'वायु', Water: 'जल',
  Horse: 'अश्व', Elephant: 'गज', Sheep: 'मेष', Serpent: 'सर्प', Dog: 'श्वान', Cat: 'मार्जार',
  Rat: 'मूषक', Cow: 'गौ', Buffalo: 'महिष', Tiger: 'व्याघ्र', Deer: 'मृग', Monkey: 'वानर',
  Mongoose: 'नकुल', Lion: 'सिंह',
  Chatushpad: 'चतुष्पद', Manav: 'मानव', Jalchar: 'जलचर', Vanchar: 'वनचर', Keet: 'कीट',
  Shukla: 'शुक्ल', Krishna: 'कृष्ण',
  Exalted: 'उच्च', Debilitated: 'नीच', Moolatrikona: 'मूलत्रिकोण', Own: 'स्वगृही',
  Friend: 'मित्र', Neutral: 'सम', Enemy: 'शत्रु',
};
