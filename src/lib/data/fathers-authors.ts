// src/lib/data/fathers-authors.ts

export type AuthorEra = 'ante-nicene' | 'nicene' | 'post-nicene';
export type AuthorTradition = 'eastern' | 'western' | 'syriac';

export interface AuthorMeta {
	/** Century 1–9 (9 = "9th or later") */
	century: number | null;
	era: AuthorEra | null;
	tradition: AuthorTradition | null;
}

// Key = canonical author name exactly as it appears in unified entries
export const AUTHORS: Record<string, AuthorMeta> = {
	// ── Top ACCS authors (by entry count) ──────────────────────────
	'St. John Chrysostom': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Augustine of Hippo': { century: 4, era: 'nicene', tradition: 'western' },
	'Origen of Alexandria': { century: 3, era: 'ante-nicene', tradition: 'eastern' },
	'St. Jerome': { century: 4, era: 'nicene', tradition: 'western' },
	'St. Ambrose of Milan': { century: 4, era: 'nicene', tradition: 'western' },
	'Bede the Venerable': { century: 8, era: 'post-nicene', tradition: 'western' },
	'Theodoret of Cyr': { century: 5, era: 'post-nicene', tradition: 'eastern' },
	'St. Cyril of Alexandria': { century: 5, era: 'post-nicene', tradition: 'eastern' },
	Ambrosiaster: { century: 4, era: 'nicene', tradition: 'western' },
	'St. Gregory the Great': { century: 6, era: 'post-nicene', tradition: 'western' },
	'St. Ephrem the Syrian': { century: 4, era: 'nicene', tradition: 'syriac' },
	Oecumenius: { century: 6, era: 'post-nicene', tradition: 'eastern' },
	'Theodore of Mopsuestia': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Basil the Great': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Caesarius of Arles': { century: 6, era: 'post-nicene', tradition: 'western' },
	Tertullian: { century: 3, era: 'ante-nicene', tradition: 'western' },
	Cassiodorus: { century: 6, era: 'post-nicene', tradition: 'western' },
	'St. Clement of Alexandria': { century: 3, era: 'ante-nicene', tradition: 'eastern' },
	Pelagius: { century: 4, era: 'nicene', tradition: 'western' },
	'Didymus the Blind': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Cyril of Jerusalem': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Gregory of Nyssa': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Athanasius of Alexandria': { century: 4, era: 'nicene', tradition: 'eastern' },
	'Eusebius of Caesarea': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Hilary of Poitiers': { century: 4, era: 'nicene', tradition: 'western' },
	'Andrew of Caesarea': { century: 6, era: 'post-nicene', tradition: 'eastern' },
	'St. Gregory of Nazianzus': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. John Cassian': { century: 5, era: 'post-nicene', tradition: 'western' },
	'Marius Victorinus': { century: 4, era: 'nicene', tradition: 'western' },
	'St. Cyprian of Carthage': { century: 3, era: 'ante-nicene', tradition: 'western' },
	Primasius: { century: 6, era: 'post-nicene', tradition: 'western' },
	'St. Hilary of Arles': { century: 5, era: 'post-nicene', tradition: 'western' },
	'St. Hippolytus of Rome': { century: 3, era: 'ante-nicene', tradition: 'western' },
	'St. Irenaeus of Lyons': { century: 2, era: 'ante-nicene', tradition: 'western' },
	Andreas: { century: 6, era: 'post-nicene', tradition: 'eastern' },
	'St. Fulgentius of Ruspe': { century: 6, era: 'post-nicene', tradition: 'western' },
	'St. Leo the Great': { century: 5, era: 'post-nicene', tradition: 'western' },
	'St. John of Damascus': { century: 8, era: 'post-nicene', tradition: 'eastern' },
	'St. Peter Chrysologus': { century: 5, era: 'post-nicene', tradition: 'western' },
	'Evagrius of Pontus': { century: 4, era: 'nicene', tradition: 'eastern' },
	'Maximus of Turin': { century: 5, era: 'post-nicene', tradition: 'western' },
	'Rabanus Maurus': { century: 9, era: 'post-nicene', tradition: 'western' },
	'Severian of Gabala': { century: 4, era: 'nicene', tradition: 'eastern' },
	'Apringius of Beja': { century: 6, era: 'post-nicene', tradition: 'western' },
	'St. Chromatius of Aquileia': { century: 4, era: 'nicene', tradition: 'western' },
	'St. Justin Martyr': { century: 2, era: 'ante-nicene', tradition: 'eastern' },
	'Diodore of Tarsus': { century: 4, era: 'nicene', tradition: 'eastern' },
	Tyconius: { century: 4, era: 'nicene', tradition: 'western' },
	'St. Maximus the Confessor': { century: 7, era: 'post-nicene', tradition: 'eastern' },
	Theophylact: { century: 9, era: 'post-nicene', tradition: 'eastern' },
	'Isidore of Seville': { century: 7, era: 'post-nicene', tradition: 'western' },
	'St. Clement of Rome': { century: 1, era: 'ante-nicene', tradition: 'western' },
	'St. Polycarp of Smyrna': { century: 2, era: 'ante-nicene', tradition: 'eastern' },
	'St. Ignatius of Antioch': { century: 2, era: 'ante-nicene', tradition: 'eastern' },
	'Shepherd of Hermas': { century: 2, era: 'ante-nicene', tradition: 'western' },
	'Letter of Barnabas': { century: 2, era: 'ante-nicene', tradition: 'eastern' },
	'Dionysius of Alexandria': { century: 3, era: 'ante-nicene', tradition: 'eastern' },
	'Gregory of Elvira': { century: 4, era: 'nicene', tradition: 'western' },
	Pachomius: { century: 4, era: 'nicene', tradition: 'eastern' },
	'Mark the Monk': { century: 5, era: 'post-nicene', tradition: 'eastern' },
	'Diadochus of Photice': { century: 5, era: 'post-nicene', tradition: 'eastern' },
	'Salvian the Presbyter': { century: 5, era: 'post-nicene', tradition: 'western' },
	'Gennadius of Constantinople': { century: 5, era: 'post-nicene', tradition: 'eastern' },
	Novatian: { century: 3, era: 'ante-nicene', tradition: 'western' },
	'St. Paulinus of Nola': { century: 4, era: 'nicene', tradition: 'western' },
	'Arnobius the Younger': { century: 5, era: 'post-nicene', tradition: 'western' },
	Lactantius: { century: 4, era: 'nicene', tradition: 'western' },
	'Minucius Felix': { century: 3, era: 'ante-nicene', tradition: 'western' },
	'Arnobius of Sicca': { century: 4, era: 'nicene', tradition: 'western' },

	// ── FKB-prominent authors ─────────────────────────────────────
	'Pope St. Clement I': { century: 1, era: 'ante-nicene', tradition: 'western' },
	'Pope St. Leo I': { century: 5, era: 'post-nicene', tradition: 'western' },
	'Pope St. Gregory I': { century: 6, era: 'post-nicene', tradition: 'western' },
	'St. Aphrahat': { century: 4, era: 'nicene', tradition: 'syriac' },
	'St. Antony the Great': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Patrick': { century: 5, era: 'post-nicene', tradition: 'western' },
	'St. Vincent of Lérins': { century: 5, era: 'post-nicene', tradition: 'western' },
	'Athenagoras of Athens': { century: 2, era: 'ante-nicene', tradition: 'eastern' },
	'St. Theophilus of Antioch': { century: 2, era: 'ante-nicene', tradition: 'eastern' },
	'St. Epiphanius of Salamis': { century: 4, era: 'nicene', tradition: 'eastern' },
	'St. Melito of Sardis': { century: 2, era: 'ante-nicene', tradition: 'eastern' },
	'Tatian the Syrian': { century: 2, era: 'ante-nicene', tradition: 'syriac' },

	// ── Documents / anonymous works ────────────────────────────────
	'Apostolic Constitutions': { century: 4, era: 'nicene', tradition: 'eastern' },
	Didache: { century: 1, era: 'ante-nicene', tradition: 'eastern' },
	Didascalia: { century: 3, era: 'ante-nicene', tradition: 'syriac' },
	'Second Clement': { century: 2, era: 'ante-nicene', tradition: null },
	'Letter to Diognetus': { century: 2, era: 'ante-nicene', tradition: null },
	'Incomplete Work on Matthew': { century: 5, era: 'post-nicene', tradition: 'western' }
};

/** Returns author meta or null fallback for unlisted authors */
export function getAuthorMeta(author: string): AuthorMeta {
	return AUTHORS[author] ?? { century: null, era: null, tradition: null };
}
