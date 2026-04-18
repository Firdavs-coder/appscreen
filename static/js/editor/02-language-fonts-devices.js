// Language catalog used across the editor UI
const supportedLanguageCatalog = [
    { code: 'en', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-gb', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'pt-br', name: 'Portuguese (BR)', flag: '🇧🇷' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'zh-tw', name: 'Chinese (Traditional)', flag: '🇹🇼' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
    { code: 'pl', name: 'Polish', flag: '🇵🇱' },
    { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
    { code: 'da', name: 'Danish', flag: '🇩🇰' },
    { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
    { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
    { code: 'th', name: 'Thai', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
    { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' }
];

const languageFlags = Object.fromEntries(supportedLanguageCatalog.map((language) => [language.code, language.flag]));

function normalizeProjectLanguages(languages) {
    const supportedCodes = new Set(supportedLanguageCatalog.map(({ code }) => code));

    let rawLanguages = [];
    if (Array.isArray(languages)) {
        rawLanguages = languages;
    } else if (typeof languages === 'string') {
        const trimmed = languages.trim();
        if (trimmed) {
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    rawLanguages = Array.isArray(parsed) ? parsed : [trimmed];
                } catch {
                    rawLanguages = [trimmed];
                }
            } else {
                rawLanguages = [trimmed];
            }
        }
    } else if (languages && typeof languages === 'object') {
        rawLanguages = Object.keys(languages);
    }

    const normalized = [];
    const seen = new Set();
    rawLanguages.forEach((lang) => {
        if (typeof lang !== 'string') return;
        const code = lang.toLowerCase().trim();
        if (!code || seen.has(code) || !supportedCodes.has(code)) return;
        seen.add(code);
        normalized.push(code);
    });

    if (!normalized.includes('en')) {
        normalized.unshift('en');
    }

    return normalized.length > 0 ? normalized : ['en'];
}

// Google Fonts configuration
const googleFonts = {
    loaded: new Set(),
    loading: new Set(),
    // Popular fonts that are commonly used for marketing/app store
    popular: [
        'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Raleway',
        'Nunito', 'Playfair Display', 'Oswald', 'Merriweather', 'Source Sans Pro',
        'PT Sans', 'Ubuntu', 'Rubik', 'Work Sans', 'Quicksand', 'Mulish', 'Barlow',
        'DM Sans', 'Manrope', 'Space Grotesk', 'Plus Jakarta Sans', 'Outfit', 'Sora',
        'Lexend', 'Figtree', 'Albert Sans', 'Urbanist', 'Satoshi', 'General Sans',
        'Bebas Neue', 'Anton', 'Archivo', 'Bitter', 'Cabin', 'Crimson Text',
        'Dancing Script', 'Fira Sans', 'Heebo', 'IBM Plex Sans', 'Josefin Sans',
        'Karla', 'Libre Franklin', 'Lora', 'Noto Sans', 'Nunito Sans', 'Pacifico',
        'Permanent Marker', 'Roboto Condensed', 'Roboto Mono', 'Roboto Slab',
        'Shadows Into Light', 'Signika', 'Slabo 27px', 'Source Code Pro', 'Titillium Web',
        'Varela Round', 'Zilla Slab', 'Arimo', 'Barlow Condensed', 'Catamaran',
        'Comfortaa', 'Cormorant Garamond', 'Dosis', 'EB Garamond', 'Exo 2',
        'Fira Code', 'Hind', 'Inconsolata', 'Indie Flower', 'Jost', 'Kanit',
        'Libre Baskerville', 'Maven Pro', 'Mukta', 'Nanum Gothic', 'Noticia Text',
        'Oxygen', 'Philosopher', 'Play', 'Prompt', 'Rajdhani', 'Red Hat Display',
        'Righteous', 'Saira', 'Sen', 'Spectral', 'Teko', 'Vollkorn', 'Yanone Kaffeesatz',
        'Zeyada', 'Amatic SC', 'Archivo Black', 'Asap', 'Assistant', 'Bangers',
        'BioRhyme', 'Cairo', 'Cardo', 'Chivo', 'Concert One', 'Cormorant',
        'Cousine', 'DM Serif Display', 'DM Serif Text', 'Dela Gothic One',
        'El Messiri', 'Encode Sans', 'Eczar', 'Fahkwang', 'Gelasio'
    ],
    // System fonts that don't need loading
    system: [
        { name: 'SF Pro Display', value: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'" },
        { name: 'SF Pro Rounded', value: "'SF Pro Rounded', -apple-system" },
        { name: 'Helvetica Neue', value: "'Helvetica Neue', Helvetica" },
        { name: 'Avenir Next', value: "'Avenir Next', Avenir" },
        { name: 'Georgia', value: "Georgia, serif" },
        { name: 'Arial', value: "Arial, sans-serif" },
        { name: 'Times New Roman', value: "'Times New Roman', serif" },
        { name: 'Courier New', value: "'Courier New', monospace" },
        { name: 'Verdana', value: "Verdana, sans-serif" },
        { name: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" }
    ],
    // Cache for all Google Fonts (loaded on demand)
    allFonts: null
};

// Load a Google Font dynamically
async function loadGoogleFont(fontName) {
    // Check if it's a system font
    const isSystem = googleFonts.system.some(f => f.name === fontName);
    if (isSystem) return;

    // If already loaded, just ensure the current weight is available
    if (googleFonts.loaded.has(fontName)) {
        const text = getTextSettings();
        const weight = text.headlineWeight || '600';
        try {
            await document.fonts.load(`${weight} 16px "${fontName}"`);
        } catch (e) {
            // Font already loaded, weight might not exist but that's ok
        }
        return;
    }

    // If currently loading, wait for it
    if (googleFonts.loading.has(fontName)) {
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 100));
        if (googleFonts.loading.has(fontName)) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return;
    }

    googleFonts.loading.add(fontName);

    try {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700;800;900&display=swap`;
        link.rel = 'stylesheet';

        // Wait for stylesheet to load first
        await new Promise((resolve, reject) => {
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });

        // Wait for the font to actually load with the required weights
        const text = getTextSettings();
        const headlineWeight = text.headlineWeight || '600';
        const subheadlineWeight = text.subheadlineWeight || '400';

        // Load all weights we might need
        await Promise.all([
            document.fonts.load(`400 16px "${fontName}"`),
            document.fonts.load(`${headlineWeight} 16px "${fontName}"`),
            document.fonts.load(`${subheadlineWeight} 16px "${fontName}"`)
        ]);

        googleFonts.loaded.add(fontName);
        googleFonts.loading.delete(fontName);
    } catch (error) {
        console.warn(`Failed to load font: ${fontName}`, error);
        googleFonts.loading.delete(fontName);
    }
}

// Fetch all Google Fonts from the API (cached)
async function fetchAllGoogleFonts() {
    if (googleFonts.allFonts) {
        return googleFonts.allFonts;
    }

    try {
        // Try to fetch from Google Fonts API v2
        // API key is optional - the API works without it but has lower rate limits
        const apiKey = state.settings?.googleFontsApiKey || '';
        const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts');
        url.searchParams.set('sort', 'popularity');
        if (apiKey) {
            url.searchParams.set('key', apiKey);
        }
        
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    // Extract font family names from API response
                    googleFonts.allFonts = data.items.map(font => font.family);
                    console.log(`Loaded ${googleFonts.allFonts.length} fonts from Google Fonts API`);
                    return googleFonts.allFonts;
                }
            } else if (response.status === 429) {
                console.warn('Google Fonts API rate limit reached, using fallback font list');
            } else {
                console.warn(`Google Fonts API returned status ${response.status}, using fallback font list`);
            }
        } catch (apiError) {
            console.warn('Failed to fetch from Google Fonts API, using fallback font list:', apiError);
        }

        // Fallback to curated list of 1000+ popular fonts
        // This list covers the most commonly used fonts on Google Fonts
        googleFonts.allFonts = [
            ...googleFonts.popular,
            'ABeeZee', 'Abel', 'Abhaya Libre', 'Abril Fatface', 'Aclonica', 'Acme',
            'Actor', 'Adamina', 'Advent Pro', 'Aguafina Script', 'Akronim', 'Aladin',
            'Aldrich', 'Alef', 'Alegreya', 'Alegreya Sans', 'Alegreya Sans SC', 'Alex Brush',
            'Alfa Slab One', 'Alice', 'Alike', 'Alike Angular', 'Allan', 'Allerta',
            'Allison', 'Allura', 'Almendra', 'Amaranth', 'Amatic SC', 'Amethysta',
            'Amiko', 'Amiri', 'Amita', 'Anaheim', 'Andada', 'Andika', 'Angkor',
            'Annie Use Your Telescope', 'Anonymous Pro', 'Antic', 'Antic Didone',
            'Antonio', 'Arapey', 'Arbutus', 'Arbutus Slab', 'Architects Daughter',
            'Archivo Narrow', 'Aref Ruqaa', 'Arima Madurai', 'Arvo', 'Asap Condensed',
            'Asar', 'Asset', 'Astloch', 'Asul', 'Athiti', 'Atkinson Hyperlegible',
            'Atomic Age', 'Aubrey', 'Audiowide', 'Autour One', 'Average', 'Average Sans',
            'Averia Gruesa Libre', 'Averia Libre', 'Averia Sans Libre', 'Averia Serif Libre',
            'B612', 'B612 Mono', 'Bad Script', 'Bahiana', 'Bahianita', 'Bai Jamjuree',
            'Baloo', 'Baloo 2', 'Balsamiq Sans', 'Balthazar', 'Baskervville',
            'Battambang', 'Baumans', 'Bellefair', 'Belleza', 'Bellota', 'Bellota Text',
            'BenchNine', 'Bentham', 'Berkshire Swash', 'Beth Ellen', 'Bevan',
            'Big Shoulders Display', 'Big Shoulders Text', 'Bigelow Rules', 'Bigshot One',
            'Bilbo', 'Bilbo Swash Caps', 'Blinker', 'Bodoni Moda', 'Bokor', 'Bonbon',
            'Boogaloo', 'Bowlby One', 'Bowlby One SC', 'Brawler', 'Bree Serif',
            'Brygada 1918', 'Bubblegum Sans', 'Bubbler One', 'Buda', 'Buenard',
            'Bungee', 'Bungee Hairline', 'Bungee Inline', 'Bungee Outline', 'Bungee Shade',
            'Butcherman', 'Butterfly Kids', 'Cabin Condensed', 'Cabin Sketch', 'Caesar Dressing',
            'Cagliostro', 'Caladea', 'Calistoga', 'Calligraffitti', 'Cambay', 'Cambo',
            'Candal', 'Cantarell', 'Cantata One', 'Cantora One', 'Capriola', 'Cardo',
            'Carme', 'Carrois Gothic', 'Carrois Gothic SC', 'Carter One', 'Castoro',
            'Caveat', 'Caveat Brush', 'Cedarville Cursive', 'Ceviche One', 'Chakra Petch',
            'Changa', 'Changa One', 'Chango', 'Charm', 'Charmonman', 'Chathura',
            'Chau Philomene One', 'Chela One', 'Chelsea Market', 'Chenla', 'Cherry Cream Soda',
            'Cherry Swash', 'Chewy', 'Chicle', 'Chilanka', 'Chonburi', 'Cinzel',
            'Cinzel Decorative', 'Clicker Script', 'Coda', 'Coda Caption', 'Codystar',
            'Coiny', 'Combo', 'Comforter', 'Comforter Brush', 'Comic Neue', 'Coming Soon',
            'Commissioner', 'Condiment', 'Content', 'Contrail One', 'Convergence',
            'Cookie', 'Copse', 'Corben', 'Corinthia', 'Cormorant Infant', 'Cormorant SC',
            'Cormorant Unicase', 'Cormorant Upright', 'Courgette', 'Courier Prime',
            'Covered By Your Grace', 'Crafty Girls', 'Creepster', 'Crete Round',
            'Crimson Pro', 'Croissant One', 'Crushed', 'Cuprum', 'Cute Font',
            'Cutive', 'Cutive Mono', 'Damion', 'Dangrek', 'Darker Grotesque',
            'David Libre', 'Dawning of a New Day', 'Days One', 'Dekko', 'Delius',
            'Delius Swash Caps', 'Delius Unicase', 'Della Respira', 'Denk One',
            'Devonshire', 'Dhurjati', 'Didact Gothic', 'Diplomata', 'Diplomata SC',
            'Do Hyeon', 'Dokdo', 'Domine', 'Donegal One', 'Dongle', 'Doppio One',
            'Dorsa', 'Droid Sans', 'Droid Sans Mono', 'Droid Serif', 'Duru Sans',
            'Dynalight', 'Eagle Lake', 'East Sea Dokdo', 'Eater', 'Economica',
            'Eczar', 'Edu NSW ACT Foundation', 'Edu QLD Beginner', 'Edu SA Beginner',
            'Edu TAS Beginner', 'Edu VIC WA NT Beginner', 'Electrolize', 'Elsie',
            'Elsie Swash Caps', 'Emblema One', 'Emilys Candy', 'Encode Sans Condensed',
            'Encode Sans Expanded', 'Encode Sans Semi Condensed', 'Encode Sans Semi Expanded',
            'Engagement', 'Englebert', 'Enriqueta', 'Ephesis', 'Epilogue', 'Erica One',
            'Esteban', 'Estonia', 'Euphoria Script', 'Ewert', 'Exo', 'Expletus Sans',
            'Explora', 'Fahkwang', 'Fanwood Text', 'Farro', 'Farsan', 'Fascinate',
            'Fascinate Inline', 'Faster One', 'Fasthand', 'Fauna One', 'Faustina',
            'Federant', 'Federo', 'Felipa', 'Fenix', 'Festive', 'Finger Paint',
            'Fira Sans Condensed', 'Fira Sans Extra Condensed', 'Fjalla One', 'Fjord One',
            'Flamenco', 'Flavors', 'Fleur De Leah', 'Flow Block', 'Flow Circular',
            'Flow Rounded', 'Fondamento', 'Fontdiner Swanky', 'Forum', 'Francois One',
            'Frank Ruhl Libre', 'Fraunces', 'Freckle Face', 'Fredericka the Great',
            'Fredoka', 'Fredoka One', 'Freehand', 'Fresca', 'Frijole', 'Fruktur',
            'Fugaz One', 'Fuggles', 'Fuzzy Bubbles', 'GFS Didot', 'GFS Neohellenic',
            'Gabriela', 'Gaegu', 'Gafata', 'Galada', 'Galdeano', 'Galindo', 'Gamja Flower',
            'Gayathri', 'Gelasio', 'Gemunu Libre', 'Genos', 'Gentium Basic', 'Gentium Book Basic',
            'Gentium Book Plus', 'Gentium Plus', 'Geo', 'Georama', 'Geostar', 'Geostar Fill',
            'Germania One', 'Gideon Roman', 'Gidugu', 'Gilda Display', 'Girassol',
            'Give You Glory', 'Glass Antiqua', 'Glegoo', 'Gloria Hallelujah', 'Glory',
            'Gluten', 'Goblin One', 'Gochi Hand', 'Goldman', 'Gorditas', 'Gothic A1',
            'Gotu', 'Goudy Bookletter 1911', 'Gowun Batang', 'Gowun Dodum', 'Graduate',
            'Grand Hotel', 'Grandstander', 'Grape Nuts', 'Gravitas One', 'Great Vibes',
            'Grechen Fuemen', 'Grenze', 'Grenze Gotisch', 'Grey Qo', 'Griffy', 'Gruppo',
            'Gudea', 'Gugi', 'Gupter', 'Gurajada', 'Gwendolyn', 'Habibi', 'Hachi Maru Pop',
            'Hahmlet', 'Halant', 'Hammersmith One', 'Hanalei', 'Hanalei Fill', 'Handlee',
            'Hanuman', 'Happy Monkey', 'Harmattan', 'Headland One', 'Hepta Slab',
            'Herr Von Muellerhoff', 'Hi Melody', 'Hina Mincho', 'Hind Guntur', 'Hind Madurai',
            'Hind Siliguri', 'Hind Vadodara', 'Holtwood One SC', 'Homemade Apple', 'Homenaje',
            'Hubballi', 'Hurricane', 'IBM Plex Mono', 'IBM Plex Sans Condensed', 'IBM Plex Serif',
            'IM Fell DW Pica', 'IM Fell DW Pica SC', 'IM Fell Double Pica', 'IM Fell Double Pica SC',
            'IM Fell English', 'IM Fell English SC', 'IM Fell French Canon', 'IM Fell French Canon SC',
            'IM Fell Great Primer', 'IM Fell Great Primer SC', 'Ibarra Real Nova', 'Iceberg',
            'Iceland', 'Imbue', 'Imperial Script', 'Imprima', 'Inconsolata', 'Inder', 'Ingrid Darling',
            'Inika', 'Inknut Antiqua', 'Inria Sans', 'Inria Serif', 'Inspiration', 'Inter Tight',
            'Irish Grover', 'Island Moments', 'Istok Web', 'Italiana', 'Italianno', 'Itim',
            'Jacques Francois', 'Jacques Francois Shadow', 'Jaldi', 'JetBrains Mono', 'Jim Nightshade',
            'Joan', 'Jockey One', 'Jolly Lodger', 'Jomhuria', 'Jomolhari', 'Josefin Slab',
            'Joti One', 'Jua', 'Judson', 'Julee', 'Julius Sans One', 'Junge', 'Jura',
            'Just Another Hand', 'Just Me Again Down Here', 'K2D', 'Kadwa', 'Kaisei Decol',
            'Kaisei HarunoUmi', 'Kaisei Opti', 'Kaisei Tokumin', 'Kalam', 'Kameron', 'Kanit',
            'Kantumruy', 'Kantumruy Pro', 'Karantina', 'Karla', 'Karma', 'Katibeh', 'Kaushan Script',
            'Kavivanar', 'Kavoon', 'Kdam Thmor Pro', 'Keania One', 'Kelly Slab', 'Kenia',
            'Khand', 'Khmer', 'Khula', 'Kings', 'Kirang Haerang', 'Kite One', 'Kiwi Maru',
            'Klee One', 'Knewave', 'KoHo', 'Kodchasan', 'Koh Santepheap', 'Kolker Brush',
            'Kosugi', 'Kosugi Maru', 'Kotta One', 'Koulen', 'Kranky', 'Kreon', 'Kristi',
            'Krona One', 'Krub', 'Kufam', 'Kulim Park', 'Kumar One', 'Kumar One Outline',
            'Kumbh Sans', 'Kurale', 'La Belle Aurore', 'Lacquer', 'Laila', 'Lakki Reddy',
            'Lalezar', 'Lancelot', 'Langar', 'Lateef', 'League Gothic', 'League Script',
            'League Spartan', 'Leckerli One', 'Ledger', 'Lekton', 'Lemon', 'Lemonada',
            'Lexend Deca', 'Lexend Exa', 'Lexend Giga', 'Lexend Mega', 'Lexend Peta',
            'Lexend Tera', 'Lexend Zetta', 'Libre Barcode 128', 'Libre Barcode 128 Text',
            'Libre Barcode 39', 'Libre Barcode 39 Extended', 'Libre Barcode 39 Extended Text',
            'Libre Barcode 39 Text', 'Libre Barcode EAN13 Text', 'Libre Bodoni', 'Libre Caslon Display',
            'Libre Caslon Text', 'Life Savers', 'Lilita One', 'Lily Script One', 'Limelight',
            'Linden Hill', 'Literata', 'Liu Jian Mao Cao', 'Livvic', 'Lobster', 'Lobster Two',
            'Londrina Outline', 'Londrina Shadow', 'Londrina Sketch', 'Londrina Solid',
            'Long Cang', 'Lora', 'Love Light', 'Love Ya Like A Sister', 'Loved by the King',
            'Lovers Quarrel', 'Luckiest Guy', 'Lusitana', 'Lustria', 'Luxurious Roman',
            'Luxurious Script', 'M PLUS 1', 'M PLUS 1 Code', 'M PLUS 1p', 'M PLUS 2',
            'M PLUS Code Latin', 'M PLUS Rounded 1c', 'Ma Shan Zheng', 'Macondo', 'Macondo Swash Caps',
            'Mada', 'Magra', 'Maiden Orange', 'Maitree', 'Major Mono Display', 'Mako', 'Mali',
            'Mallanna', 'Mandali', 'Manjari', 'Mansalva', 'Manuale', 'Marcellus', 'Marcellus SC',
            'Marck Script', 'Margarine', 'Markazi Text', 'Marko One', 'Marmelad', 'Martel',
            'Martel Sans', 'Marvel', 'Mate', 'Mate SC', 'Material Icons', 'Material Icons Outlined',
            'Material Icons Round', 'Material Icons Sharp', 'Material Icons Two Tone', 'Material Symbols Outlined',
            'Material Symbols Rounded', 'Material Symbols Sharp', 'Maven Pro', 'McLaren', 'Mea Culpa',
            'Meddon', 'MedievalSharp', 'Medula One', 'Meera Inimai', 'Megrim', 'Meie Script',
            'Meow Script', 'Merienda', 'Merienda One', 'Merriweather Sans', 'Metal', 'Metal Mania',
            'Metamorphous', 'Metrophobic', 'Michroma', 'Milonga', 'Miltonian', 'Miltonian Tattoo',
            'Mina', 'Miniver', 'Miriam Libre', 'Mirza', 'Miss Fajardose', 'Mitr', 'Mochiy Pop One',
            'Mochiy Pop P One', 'Modak', 'Modern Antiqua', 'Mogra', 'Mohave', 'Molengo', 'Molle',
            'Monda', 'Monofett', 'Monoton', 'Monsieur La Doulaise', 'Montaga', 'Montagu Slab',
            'MonteCarlo', 'Montez', 'Montserrat Alternates', 'Montserrat Subrayada', 'Moo Lah Lah',
            'Moon Dance', 'Moul', 'Moulpali', 'Mountains of Christmas', 'Mouse Memoirs', 'Mr Bedfort',
            'Mr Dafoe', 'Mr De Haviland', 'Mrs Saint Delafield', 'Mrs Sheppards', 'Ms Madi', 'Mukta Mahee',
            'Mukta Malar', 'Mukta Vaani', 'Muli', 'Murecho', 'MuseoModerno', 'My Soul', 'Mystery Quest',
            'NTR', 'Nanum Brush Script', 'Nanum Gothic Coding', 'Nanum Myeongjo', 'Nanum Pen Script',
            'Neonderthaw', 'Nerko One', 'Neucha', 'Neuton', 'New Rocker', 'New Tegomin', 'News Cycle',
            'Newsreader', 'Niconne', 'Niramit', 'Nixie One', 'Nobile', 'Nokora', 'Norican', 'Nosifer',
            'Notable', 'Nothing You Could Do', 'Noticia Text', 'Noto Color Emoji', 'Noto Emoji',
            'Noto Kufi Arabic', 'Noto Music', 'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'Noto Rashi Hebrew',
            'Noto Sans Arabic', 'Noto Sans Bengali', 'Noto Sans Devanagari', 'Noto Sans Display',
            'Noto Sans Georgian', 'Noto Sans Hebrew', 'Noto Sans HK', 'Noto Sans JP', 'Noto Sans KR',
            'Noto Sans Mono', 'Noto Sans SC', 'Noto Sans TC', 'Noto Sans Thai', 'Noto Serif',
            'Noto Serif Bengali', 'Noto Serif Devanagari', 'Noto Serif Display', 'Noto Serif Georgian',
            'Noto Serif Hebrew', 'Noto Serif JP', 'Noto Serif KR', 'Noto Serif SC', 'Noto Serif TC',
            'Noto Serif Thai', 'Nova Cut', 'Nova Flat', 'Nova Mono', 'Nova Oval', 'Nova Round',
            'Nova Script', 'Nova Slim', 'Nova Square', 'Numans', 'Nunito', 'Nunito Sans', 'Nuosu SIL',
            'Odibee Sans', 'Odor Mean Chey', 'Offside', 'Oi', 'Old Standard TT', 'Oldenburg', 'Ole',
            'Oleo Script', 'Oleo Script Swash Caps', 'Oooh Baby', 'Open Sans Condensed', 'Oranienbaum',
            'Orbit', 'Orbitron', 'Oregano', 'Orelega One', 'Orienta', 'Original Surfer', 'Oswald',
            'Otomanopee One', 'Outfit', 'Over the Rainbow', 'Overlock', 'Overlock SC', 'Overpass',
            'Overpass Mono', 'Ovo', 'Oxanium', 'Oxygen Mono', 'PT Mono', 'PT Sans Caption',
            'PT Sans Narrow', 'PT Serif', 'PT Serif Caption', 'Pacifico', 'Padauk', 'Padyakke Expanded One',
            'Palanquin', 'Palanquin Dark', 'Palette Mosaic', 'Pangolin', 'Paprika', 'Parisienne',
            'Passero One', 'Passion One', 'Passions Conflict', 'Pathway Gothic One', 'Patrick Hand',
            'Patrick Hand SC', 'Pattaya', 'Patua One', 'Pavanam', 'Paytone One', 'Peddana',
            'Peralta', 'Permanent Marker', 'Petemoss', 'Petit Formal Script', 'Petrona', 'Phetsarath',
            'Philosopher', 'Piazzolla', 'Piedra', 'Pinyon Script', 'Pirata One', 'Plaster', 'Play',
            'Playball', 'Playfair Display SC', 'Podkova', 'Poiret One', 'Poller One', 'Poly', 'Pompiere',
            'Pontano Sans', 'Poor Story', 'Poppins', 'Port Lligat Sans', 'Port Lligat Slab', 'Potta One',
            'Pragati Narrow', 'Praise', 'Prata', 'Preahvihear', 'Press Start 2P', 'Pridi', 'Princess Sofia',
            'Prociono', 'Prompt', 'Prosto One', 'Proza Libre', 'Public Sans', 'Puppies Play', 'Puritan',
            'Purple Purse', 'Qahiri', 'Quando', 'Quantico', 'Quattrocento', 'Quattrocento Sans', 'Questrial',
            'Quicksand', 'Quintessential', 'Qwigley', 'Qwitcher Grypen', 'Racing Sans One', 'Radio Canada',
            'Radley', 'Rajdhani', 'Rakkas', 'Raleway Dots', 'Ramabhadra', 'Ramaraja', 'Rambla', 'Rammetto One',
            'Rampart One', 'Ranchers', 'Rancho', 'Ranga', 'Rasa', 'Rationale', 'Ravi Prakash', 'Readex Pro',
            'Recursive', 'Red Hat Mono', 'Red Hat Text', 'Red Rose', 'Redacted', 'Redacted Script', 'Redressed',
            'Reem Kufi', 'Reenie Beanie', 'Reggae One', 'Revalia', 'Rhodium Libre', 'Ribeye', 'Ribeye Marrow',
            'Righteous', 'Risque', 'Road Rage', 'Roboto Flex', 'Rochester', 'Rock Salt', 'RocknRoll One',
            'Rokkitt', 'Romanesco', 'Ropa Sans', 'Rosario', 'Rosarivo', 'Rouge Script', 'Rowdies', 'Rozha One',
            'Rubik Beastly', 'Rubik Bubbles', 'Rubik Burned', 'Rubik Dirt', 'Rubik Distressed', 'Rubik Glitch',
            'Rubik Marker Hatch', 'Rubik Maze', 'Rubik Microbe', 'Rubik Mono One', 'Rubik Moonrocks',
            'Rubik Puddles', 'Rubik Wet Paint', 'Ruda', 'Rufina', 'Ruge Boogie', 'Ruluko', 'Rum Raisin',
            'Ruslan Display', 'Russo One', 'Ruthie', 'Rye', 'STIX Two Math', 'STIX Two Text', 'Sacramento',
            'Sahitya', 'Sail', 'Saira Condensed', 'Saira Extra Condensed', 'Saira Semi Condensed', 'Saira Stencil One',
            'Salsa', 'Sanchez', 'Sancreek', 'Sansita', 'Sansita Swashed', 'Sarabun', 'Sarala', 'Sarina', 'Sarpanch',
            'Sassy Frass', 'Satisfy', 'Sawarabi Gothic', 'Sawarabi Mincho', 'Scada', 'Scheherazade New', 'Schoolbell',
            'Scope One', 'Seaweed Script', 'Secular One', 'Sedgwick Ave', 'Sedgwick Ave Display', 'Sen',
            'Send Flowers', 'Sevillana', 'Seymour One', 'Shadows Into Light Two', 'Shalimar', 'Shanti',
            'Share', 'Share Tech', 'Share Tech Mono', 'Shippori Antique', 'Shippori Antique B1', 'Shippori Mincho',
            'Shippori Mincho B1', 'Shizuru', 'Shojumaru', 'Short Stack', 'Shrikhand', 'Siemreap', 'Sigmar One',
            'Signika Negative', 'Silkscreen', 'Simonetta', 'Single Day', 'Sintony', 'Sirin Stencil', 'Six Caps',
            'Skranji', 'Slabo 13px', 'Slackey', 'Smokum', 'Smooch', 'Smooch Sans', 'Smythe', 'Sniglet',
            'Snippet', 'Snowburst One', 'Sofadi One', 'Sofia', 'Sofia Sans', 'Sofia Sans Condensed',
            'Sofia Sans Extra Condensed', 'Sofia Sans Semi Condensed', 'Solitreo', 'Solway', 'Song Myung',
            'Sophia', 'Sora', 'Sorts Mill Goudy', 'Source Code Pro', 'Source Sans 3', 'Source Serif 4',
            'Source Serif Pro', 'Space Mono', 'Spartan', 'Special Elite', 'Spectral SC', 'Spicy Rice',
            'Spinnaker', 'Spirax', 'Splash', 'Spline Sans', 'Spline Sans Mono', 'Squada One', 'Square Peg',
            'Sree Krushnadevaraya', 'Sriracha', 'Srisakdi', 'Staatliches', 'Stalemate', 'Stalinist One',
            'Stardos Stencil', 'Stick', 'Stick No Bills', 'Stint Ultra Condensed', 'Stint Ultra Expanded',
            'Stoke', 'Strait', 'Style Script', 'Stylish', 'Sue Ellen Francisco', 'Suez One', 'Sulphur Point',
            'Sumana', 'Sunflower', 'Sunshiney', 'Supermercado One', 'Sura', 'Suranna', 'Suravaram', 'Suwannaphum',
            'Swanky and Moo Moo', 'Syncopate', 'Syne', 'Syne Mono', 'Syne Tactile', 'Tajawal', 'Tangerine',
            'Tapestry', 'Taprom', 'Tauri', 'Taviraj', 'Teko', 'Telex', 'Tenali Ramakrishna', 'Tenor Sans',
            'Text Me One', 'Texturina', 'Thasadith', 'The Girl Next Door', 'The Nautigal', 'Tienne', 'Tillana',
            'Tilt Neon', 'Tilt Prism', 'Tilt Warp', 'Timmana', 'Tinos', 'Tiro Bangla', 'Tiro Devanagari Hindi',
            'Tiro Devanagari Marathi', 'Tiro Devanagari Sanskrit', 'Tiro Gurmukhi', 'Tiro Kannada', 'Tiro Tamil',
            'Tiro Telugu', 'Titan One', 'Trade Winds', 'Train One', 'Trirong', 'Trispace', 'Trocchi',
            'Trochut', 'Truculenta', 'Trykker', 'Tulpen One', 'Turret Road', 'Twinkle Star', 'Ubuntu Condensed',
            'Ubuntu Mono', 'Uchen', 'Ultra', 'Uncial Antiqua', 'Underdog', 'Unica One', 'UnifrakturCook',
            'UnifrakturMaguntia', 'Unkempt', 'Unlock', 'Unna', 'Updock', 'Urbanist', 'Varta', 'Vast Shadow',
            'Vazirmatn', 'Vesper Libre', 'Viaoda Libre', 'Vibes', 'Vibur', 'Vidaloka', 'Viga', 'Voces',
            'Volkhov', 'Vollkorn SC', 'Voltaire', 'Vujahday Script', 'Waiting for the Sunrise', 'Wallpoet',
            'Walter Turncoat', 'Warnes', 'Water Brush', 'Waterfall', 'Wellfleet', 'Wendy One', 'Whisper',
            'WindSong', 'Wire One', 'Wix Madefor Display', 'Wix Madefor Text', 'Work Sans', 'Xanh Mono',
            'Yaldevi', 'Yanone Kaffeesatz', 'Yantramanav', 'Yatra One', 'Yellowtail', 'Yeon Sung', 'Yeseva One',
            'Yesteryear', 'Yomogi', 'Yrsa', 'Ysabeau', 'Ysabeau Infant', 'Ysabeau Office', 'Ysabeau SC',
            'Yuji Boku', 'Yuji Hentaigana Akari', 'Yuji Hentaigana Akebono', 'Yuji Mai', 'Yuji Syuku',
            'Yusei Magic', 'ZCOOL KuaiLe', 'ZCOOL QingKe HuangYou', 'ZCOOL XiaoWei', 'Zen Antique',
            'Zen Antique Soft', 'Zen Dots', 'Zen Kaku Gothic Antique', 'Zen Kaku Gothic New', 'Zen Kurenaido',
            'Zen Loop', 'Zen Maru Gothic', 'Zen Old Mincho', 'Zen Tokyo Zoo', 'Zeyada', 'Zhi Mang Xing',
            'Zilla Slab Highlight'
        ];
        // Remove duplicates
        googleFonts.allFonts = [...new Set(googleFonts.allFonts)].sort();
        return googleFonts.allFonts;
    } catch (error) {
        console.error('Failed to load font list:', error);
        return googleFonts.popular;
    }
}

// Font picker state - separate state for each picker
const fontPickerState = {
    headline: { category: 'popular', search: '' },
    subheadline: { category: 'popular', search: '' },
    element: { category: 'popular', search: '' }
};

// Initialize all font pickers
function initFontPicker() {
    initSingleFontPicker('headline', {
        picker: 'font-picker',
        trigger: 'font-picker-trigger',
        dropdown: 'font-picker-dropdown',
        search: 'font-search',
        list: 'font-picker-list',
        preview: 'font-picker-preview',
        hidden: 'headline-font',
        stateKey: 'headlineFont'
    });

    initSingleFontPicker('subheadline', {
        picker: 'subheadline-font-picker',
        trigger: 'subheadline-font-picker-trigger',
        dropdown: 'subheadline-font-picker-dropdown',
        search: 'subheadline-font-search',
        list: 'subheadline-font-picker-list',
        preview: 'subheadline-font-picker-preview',
        hidden: 'subheadline-font',
        stateKey: 'subheadlineFont'
    });

    initSingleFontPicker('element', {
        picker: 'element-font-picker',
        trigger: 'element-font-picker-trigger',
        dropdown: 'element-font-picker-dropdown',
        search: 'element-font-search',
        list: 'element-font-picker-list',
        preview: 'element-font-picker-preview',
        hidden: 'element-font',
        stateKey: 'font',
        getFont: () => { const el = getSelectedElement(); return el ? el.font : ''; },
        setFont: (value) => { if (selectedElementId) setElementProperty(selectedElementId, 'font', value); }
    });
}

// Initialize a single font picker instance
function initSingleFontPicker(pickerId, ids) {
    const trigger = document.getElementById(ids.trigger);
    const dropdown = document.getElementById(ids.dropdown);
    const searchInput = document.getElementById(ids.search);
    const picker = document.getElementById(ids.picker);

    if (!trigger || !dropdown) return;

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other font picker dropdowns
        document.querySelectorAll('.font-picker-dropdown.open').forEach(d => {
            if (d.id !== ids.dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
        if (dropdown.classList.contains('open')) {
            searchInput.focus();
            renderFontList(pickerId, ids);
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest(`#${ids.picker}`)) {
            dropdown.classList.remove('open');
        }
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        fontPickerState[pickerId].search = e.target.value.toLowerCase();
        renderFontList(pickerId, ids);
    });

    // Prevent dropdown close when clicking inside
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Category buttons
    const categoryButtons = picker.querySelectorAll('.font-category');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fontPickerState[pickerId].category = btn.dataset.category;
            renderFontList(pickerId, ids);
        });
    });

    // Initial render
    renderFontList(pickerId, ids);
}

// Render the font list for a specific picker
async function renderFontList(pickerId, ids) {
    const fontList = document.getElementById(ids.list);
    if (!fontList) return;

    const pickerState = fontPickerState[pickerId];
    let fonts = [];
    const currentFont = ids.getFont ? ids.getFont() : getTextSettings()[ids.stateKey];

    if (pickerState.category === 'system') {
        fonts = googleFonts.system.map(f => ({
            name: f.name,
            value: f.value,
            category: 'system'
        }));
    } else if (pickerState.category === 'popular') {
        fonts = googleFonts.popular.map(name => ({
            name,
            value: `'${name}', sans-serif`,
            category: 'google'
        }));
    } else {
        // All fonts
        const allFonts = await fetchAllGoogleFonts();
        fonts = [
            ...googleFonts.system.map(f => ({
                name: f.name,
                value: f.value,
                category: 'system'
            })),
            ...allFonts.map(name => ({
                name,
                value: `'${name}', sans-serif`,
                category: 'google'
            }))
        ];
    }

    // Filter by search
    if (pickerState.search) {
        fonts = fonts.filter(f => f.name.toLowerCase().includes(pickerState.search));
    }

    // Limit to prevent performance issues
    const displayFonts = fonts.slice(0, 100);

    if (displayFonts.length === 0) {
        fontList.innerHTML = '<div class="font-picker-empty">No fonts found</div>';
        return;
    }

    fontList.innerHTML = displayFonts.map(font => {
        const isSelected = currentFont && (currentFont.includes(font.name) || currentFont === font.value);
        const isLoaded = font.category === 'system' || googleFonts.loaded.has(font.name);
        const isLoading = googleFonts.loading.has(font.name);

        return `
            <div class="font-option ${isSelected ? 'selected' : ''}"
                 data-font-name="${font.name}"
                 data-font-value="${font.value}"
                 data-font-category="${font.category}">
                <span class="font-option-name" style="font-family: ${isLoaded ? font.value : 'inherit'}">${font.name}</span>
                ${isLoading ? '<span class="font-option-loading">Loading...</span>' :
                `<span class="font-option-category">${font.category}</span>`}
            </div>
        `;
    }).join('');

    // Add click handlers
    fontList.querySelectorAll('.font-option').forEach(option => {
        option.addEventListener('click', async () => {
            const fontName = option.dataset.fontName;
            const fontValue = option.dataset.fontValue;
            const fontCategory = option.dataset.fontCategory;

            // Load Google Font if needed
            if (fontCategory === 'google') {
                option.querySelector('.font-option-category').textContent = 'Loading...';
                option.querySelector('.font-option-category').classList.add('font-option-loading');
                await loadGoogleFont(fontName);
                option.querySelector('.font-option-name').style.fontFamily = fontValue;
                option.querySelector('.font-option-category').textContent = 'google';
                option.querySelector('.font-option-category').classList.remove('font-option-loading');
            }

            // Update state
            document.getElementById(ids.hidden).value = fontValue;
            if (ids.setFont) {
                ids.setFont(fontValue);
            } else {
                setTextValue(ids.stateKey, fontValue);
            }

            // Update preview
            const preview = document.getElementById(ids.preview);
            preview.textContent = fontName;
            preview.style.fontFamily = fontValue;

            // Update selection in list
            fontList.querySelectorAll('.font-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            // Close dropdown
            document.getElementById(ids.dropdown).classList.remove('open');

            updateCanvas();
        });

        // Preload font on hover for better UX
        option.addEventListener('mouseenter', () => {
            const fontName = option.dataset.fontName;
            const fontCategory = option.dataset.fontCategory;
            if (fontCategory === 'google' && !googleFonts.loaded.has(fontName)) {
                loadGoogleFont(fontName).then(() => {
                    option.querySelector('.font-option-name').style.fontFamily = option.dataset.fontValue;
                });
            }
        });
    });
}

// Update font picker preview from state
function updateFontPickerPreview() {
    updateSingleFontPickerPreview('headline-font', 'font-picker-preview', 'headlineFont');
    updateSingleFontPickerPreview('subheadline-font', 'subheadline-font-picker-preview', 'subheadlineFont');
}

function updateSingleFontPickerPreview(hiddenId, previewId, stateKey) {
    const preview = document.getElementById(previewId);
    const hiddenInput = document.getElementById(hiddenId);
    if (!preview || !hiddenInput) return;

    const text = getTextSettings();
    const fontValue = text[stateKey];
    if (!fontValue) return;

    hiddenInput.value = fontValue;

    // Extract font name from value
    let fontName = 'SF Pro Display';
    const systemFont = googleFonts.system.find(f => f.value === fontValue);
    if (systemFont) {
        fontName = systemFont.name;
    } else {
        // Try to extract from Google Font value like "'Roboto', sans-serif"
        const match = fontValue.match(/'([^']+)'/);
        if (match) {
            fontName = match[1];
            // Load the font if it's a Google Font
            loadGoogleFont(fontName);
        }
    }

    preview.textContent = fontName;
    preview.style.fontFamily = fontValue;
}

function updateElementFontPickerPreview(el) {
    const preview = document.getElementById('element-font-picker-preview');
    const hiddenInput = document.getElementById('element-font');
    if (!preview || !hiddenInput || !el) return;

    const fontValue = el.font;
    if (!fontValue) return;

    hiddenInput.value = fontValue;

    let fontName = 'SF Pro Display';
    const systemFont = googleFonts.system.find(f => f.value === fontValue);
    if (systemFont) {
        fontName = systemFont.name;
    } else {
        const match = fontValue.match(/'([^']+)'/);
        if (match) {
            fontName = match[1];
            loadGoogleFont(fontName);
        }
    }

    preview.textContent = fontName;
    preview.style.fontFamily = fontValue;
}

// Device dimensions
const deviceDimensions = {
    'iphone-6.9': { width: 1320, height: 2868 },
    'iphone-6.7': { width: 1290, height: 2796 },
    'iphone-6.5': { width: 1284, height: 2778 },
    'iphone-5.5': { width: 1242, height: 2208 },
    'ipad-12.9': { width: 2048, height: 2732 },
    'ipad-11': { width: 1668, height: 2388 },
    'android-phone': { width: 1080, height: 1920 },
    'android-phone-hd': { width: 1440, height: 2560 },
    'android-tablet-7': { width: 1200, height: 1920 },
    'android-tablet-10': { width: 1600, height: 2560 },
    'web-og': { width: 1200, height: 630 },
    'web-twitter': { width: 1200, height: 675 },
    'web-hero': { width: 1920, height: 1080 },
    'web-feature': { width: 1024, height: 500 }
};

const twoDDeviceModels = {
    'samsung-galaxy-s24-ultra-2024-medium': {
        id: 'samsung-galaxy-s24-ultra-2024-medium',
        label: 'Samsung Galaxy S24 Ultra',
        frameSrc: 'models/2d/samsung-galaxy-s24-ultra-2024-medium.png',
        screen: {
            x: 16 / 366,
            y: 13 / 750,
            width: 333 / 366,
            height: 722 / 750
        },
        screenCornerRadiusRatio: 0.01,
        frameCornerRadiusRatio: 0.03,
        frameImage: null,
        frameImageLoading: false
    },
    'samsung-galaxy-s24-2024-medium': {
        id: 'samsung-galaxy-s24-2024-medium',
        label: 'Samsung Galaxy S24',
        frameSrc: 'models/2d/samsung-galaxy-s24-2024-medium.png',
        screen: {
            x: 13 / 362,
            y: 13 / 750,
            width: 334 / 362,
            height: 725 / 750
        },
        screenCornerRadiusRatio: 0.10,
        frameCornerRadiusRatio: 0.12,
        frameImage: null,
        frameImageLoading: false
    },
    'google-pixel-8-2024-medium': {
        id: 'google-pixel-8-2024-medium',
        label: 'Google Pixel 8',
        frameSrc: 'models/2d/google-pixel-8-2024-medium.png',
        screen: {
            x: 16 / 356,
            y: 16 / 750,
            width: 321 / 356,
            height: 715 / 750
        },
        screenCornerRadiusRatio: 0.09,
        frameCornerRadiusRatio: 0.11,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-air-2025-medium': {
        id: 'apple-iphone-air-2025-medium',
        label: 'Apple iPhone Air',
        frameSrc: 'models/2d/apple-iphone-air-2025-medium.png',
        screen: {
            x: 14 / 363,
            y: 12 / 750,
            width: 335 / 363,
            height: 727 / 750
        },
        screenCornerRadiusRatio: 0.17,
        frameCornerRadiusRatio: 0.19,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-16-pro-max-2024-medium': {
        id: 'apple-iphone-16-pro-max-2024-medium',
        label: 'Apple iPhone 16 Pro Max',
        frameSrc: 'models/2d/apple-iphone-16-pro-max-2024-medium.png',
        screen: {
            x: 16 / 364,
            y: 14 / 750,
            width: 332 / 364,
            height: 723 / 750
        },
        screenCornerRadiusRatio: 0.17,
        frameCornerRadiusRatio: 0.19,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-16-plus-2024-medium': {
        id: 'apple-iphone-16-plus-2024-medium',
        label: 'Apple iPhone 16 Plus',
        frameSrc: 'models/2d/apple-iphone-16-plus-2024-medium.png',
        screen: {
            x: 20 / 369,
            y: 17 / 750,
            width: 329 / 369,
            height: 715 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-16-2024-medium': {
        id: 'apple-iphone-16-2024-medium',
        label: 'Apple iPhone 16',
        frameSrc: 'models/2d/apple-iphone-16-2024-medium.png',
        screen: {
            x: 20 / 369,
            y: 17 / 750,
            width: 329 / 369,
            height: 715 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-14-pro-max-2022-medium': {
        id: 'apple-iphone-14-pro-max-2022-medium',
        label: 'Apple iPhone 14 Pro Max',
        frameSrc: 'models/2d/apple-iphone-14-pro-max-2022-medium.png',
        screen: {
            x: 20 / 368,
            y: 18 / 750,
            width: 329 / 368,
            height: 714 / 750
        },
        screenCornerRadiusRatio: 0.17,
        frameCornerRadiusRatio: 0.19,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-14-pro-2022-medium': {
        id: 'apple-iphone-14-pro-2022-medium',
        label: 'Apple iPhone 14 Pro',
        frameSrc: 'models/2d/apple-iphone-14-pro-2022-medium.png',
        screen: {
            x: 20 / 368,
            y: 18 / 750,
            width: 329 / 368,
            height: 715 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-14-max-2022-medium': {
        id: 'apple-iphone-14-max-2022-medium',
        label: 'Apple iPhone 14 Max',
        frameSrc: 'models/2d/apple-iphone-14-max-2022-medium.png',
        screen: {
            x: 20 / 370,
            y: 17 / 750,
            width: 331 / 370,
            height: 716 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-14-2022-medium': {
        id: 'apple-iphone-14-2022-medium',
        label: 'Apple iPhone 14',
        frameSrc: 'models/2d/apple-iphone-14-2022-medium.png',
        screen: {
            x: 20 / 368,
            y: 17 / 750,
            width: 329 / 368,
            height: 714 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-15-pro-max-2023-medium': {
        id: 'apple-iphone-15-pro-max-2023-medium',
        label: 'Apple iPhone 15 Pro Max',
        frameSrc: 'models/2d/apple-iphone-15-pro-max-2023-medium.png',
        screen: {
            x: 15 / 365,
            y: 13 / 750,
            width: 334 / 365,
            height: 725 / 750
        },
        screenCornerRadiusRatio: 0.17,
        frameCornerRadiusRatio: 0.19,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-15-pro-2023-medium': {
        id: 'apple-iphone-15-pro-2023-medium',
        label: 'Apple iPhone 15 Pro',
        frameSrc: 'models/2d/apple-iphone-15-pro-2023-medium.png',
        screen: {
            x: 18 / 367,
            y: 14 / 750,
            width: 332 / 367,
            height: 722 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-15-plus-2023-medium': {
        id: 'apple-iphone-15-plus-2023-medium',
        label: 'Apple iPhone 15 Plus',
        frameSrc: 'models/2d/apple-iphone-15-plus-2023-medium.png',
        screen: {
            x: 18 / 368,
            y: 14 / 750,
            width: 333 / 368,
            height: 722 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-15-2023-medium': {
        id: 'apple-iphone-15-2023-medium',
        label: 'Apple iPhone 15',
        frameSrc: 'models/2d/apple-iphone-15-2023-medium.png',
        screen: {
            x: 18 / 367,
            y: 15 / 750,
            width: 332 / 367,
            height: 720 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-17-pro-max-2025-medium': {
        id: 'apple-iphone-17-pro-max-2025-medium',
        label: 'Apple iPhone 17 Pro Max',
        frameSrc: 'models/2d/apple-iphone-17-pro-max-2025-medium.png',
        screen: {
            x: 16 / 365,
            y: 13 / 750,
            width: 333 / 365,
            height: 724 / 750
        },
        screenCornerRadiusRatio: 0.17,
        frameCornerRadiusRatio: 0.19,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-17-pro-2025-medium': {
        id: 'apple-iphone-17-pro-2025-medium',
        label: 'Apple iPhone 17 Pro',
        frameSrc: 'models/2d/apple-iphone-17-pro-2025-medium.png',
        screen: {
            x: 16 / 365,
            y: 13 / 750,
            width: 334 / 365,
            height: 724 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    },
    'apple-iphone-17-2025-medium': {
        id: 'apple-iphone-17-2025-medium',
        label: 'Apple iPhone 17',
        frameSrc: 'models/2d/apple-iphone-17-2025-medium.png',
        screen: {
            x: 15 / 363,
            y: 13 / 750,
            width: 333 / 363,
            height: 724 / 750
        },
        screenCornerRadiusRatio: 0.15,
        frameCornerRadiusRatio: 0.17,
        frameImage: null,
        frameImageLoading: false
    }
};

function get2DDeviceModelId(settings = getScreenshotSettings()) {
    const settingModelId = settings?.device2D;
    if (settingModelId !== undefined && settingModelId !== null) {
        return settingModelId;
    }

    const defaultModelId = state.defaults?.screenshot?.device2D;
    return (defaultModelId !== undefined && defaultModelId !== null) ? defaultModelId : '';
}

function get2DDeviceModel(settings = getScreenshotSettings()) {
    const modelId = get2DDeviceModelId(settings);
    if (!modelId) return null;
    return twoDDeviceModels[modelId] || null;
}

function ensure2DDeviceFrameImage(model) {
    if (!model) return null;

    if (model.frameImage && model.frameImage.complete && model.frameImage.naturalWidth > 0) {
        return model.frameImage;
    }

    if (!model.frameImageLoading) {
        model.frameImageLoading = true;
        const frameImage = new Image();
        frameImage.onload = () => {
            model.frameImageLoading = false;
            model.frameImage = frameImage;
            updateCanvas();
        };
        frameImage.onerror = () => {
            model.frameImageLoading = false;
            model.frameImage = null;
        };
        frameImage.src = model.frameSrc;
        model.frameImage = frameImage;
    }

    return null;
}

function get2DDeviceLayoutForScreen(model, screenX, screenY, screenWidth, screenHeight, settings) {
    if (!model || !model.screen || model.screen.width <= 0 || model.screen.height <= 0) {
        return null;
    }

    const frameWidth = screenWidth / model.screen.width;
    const frameHeight = screenHeight / model.screen.height;
    const frameX = screenX - model.screen.x * frameWidth;
    const frameY = screenY - model.screen.y * frameHeight;

    const cornerRadiusScale = Math.max(0, (settings?.cornerRadius ?? 24) / 24);

    // Device model ratios represent the actual corner-radius-to-screen-width fraction
    // measured from the frame PNG.  Apply them directly (ratioScale = 1) so the clip
    // path matches the physical device frame corners.
    const ratioScale = 1.0;
    const screenRadiusRaw = (model.screenCornerRadiusRatio || 0.14) * screenWidth * ratioScale * cornerRadiusScale;
    const frameRadiusRaw = (model.frameCornerRadiusRatio || 0.16) * frameWidth * ratioScale;
    const screenRadius = Math.max(0, Math.min(screenRadiusRaw, Math.min(screenWidth, screenHeight) / 2));
    const frameRadius = Math.max(0, Math.min(frameRadiusRaw, Math.min(frameWidth, frameHeight) / 2));

    return {
        frameX,
        frameY,
        frameWidth,
        frameHeight,
        frameRadius,
        screenX,
        screenY,
        screenWidth,
        screenHeight,
        screenRadius
    };
}

function addRoundedRectPath(context, x, y, width, height, radius) {
    if (typeof context.roundRect === 'function') {
        context.roundRect(x, y, width, height, radius);
    } else {
        roundRect(context, x, y, width, height, radius);
    }
}

function drawImageCoverToRect(context, image, x, y, width, height) {
    if (!image || width <= 0 || height <= 0) return;

    const imageAspect = image.width / image.height;
    const targetAspect = width / height;

    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;

    if (imageAspect > targetAspect) {
        sw = image.height * targetAspect;
        sx = (image.width - sw) / 2;
    } else if (imageAspect < targetAspect) {
        sh = image.width / targetAspect;
        sy = (image.height - sh) / 2;
    }

    context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function draw2DFramedScreenshotToRect(context, dims, image, modelLayout, frameImage) {
    if (!context || !dims || !image || !modelLayout || !frameImage) return;

    // Draw directly into a tight rounded clip. This prevents screenshot bleed when
    // frame PNGs have transparent/non-opaque regions outside the actual display area.
    const bleedGuard = Math.max(1, Math.round(Math.min(modelLayout.screenWidth, modelLayout.screenHeight) * 0.005));
    const screenX = modelLayout.screenX + bleedGuard;
    const screenY = modelLayout.screenY + bleedGuard;
    const screenWidth = Math.max(0, modelLayout.screenWidth - bleedGuard * 2);
    const screenHeight = Math.max(0, modelLayout.screenHeight - bleedGuard * 2);
    const screenRadius = Math.max(0, (modelLayout.screenRadius || 0) - bleedGuard);

    if (screenWidth <= 0 || screenHeight <= 0) return;

    context.save();
    context.beginPath();
    addRoundedRectPath(context, screenX, screenY, screenWidth, screenHeight, screenRadius);
    context.clip();
    drawImageCoverToRect(context, image, screenX, screenY, screenWidth, screenHeight);
    context.restore();
}

