// World Cup Pixel Ball - App State & Interaction Manager

// App State
const state = {
    walletConnected: false,
    userAddress: '0x71C2c3E5a9d28B15951804E19c362095f4b233a9',
    userUSDC: 150.00,
    userETH: 0.054,
    pixels: [],
    mintedCount: 1684,
    totalCount: 2000,
    rareCount: 112, // 10 Trophy + 20 Champion + 32 Captain + 50 Gold
    simSpeed: 'normal', // 'normal' or 'fast'
    simTimer: null,
    selectedPixelId: null,
    audioInitialized: false,
    audioPlaying: false,
    marketplaceUnlocked: false,
    auctions: [],
    listings: []
};

// World Cup countries list for simulations
const countries = [
    { name: 'Brazil', flag: '🇧🇷', color: '#ffd700', text: '#009739' },
    { name: 'Argentina', flag: '🇦🇷', color: '#75aadb', text: '#ffffff' },
    { name: 'France', flag: '🇫🇷', color: '#002395', text: '#ffffff' },
    { name: 'Germany', flag: '🇩🇪', color: '#000000', text: '#ffcc00' },
    { name: 'Spain', flag: '🇪🇸', color: '#c60b1e', text: '#ffc400' },
    { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#ffffff', text: '#da291c' },
    { name: 'Japan', flag: '🇯🇵', color: '#bc002d', text: '#ffffff' },
    { name: 'Mexico', flag: '🇲🇽', color: '#006847', text: '#ffffff' },
    { name: 'Italy', flag: '🇮🇹', color: '#008c45', text: '#cd212a' },
    { name: 'Portugal', flag: '🇵🇹', color: '#006600', text: '#ff0000' }
];

// Pool of custom handwritten quotes (Unique Human Touch)
const supporterQuotes = [
    "For Messi! 🐐",
    "Go Brazil! 🇧🇷",
    "World Cup 2026! ⚽",
    "Vive la France! 🇫🇷",
    "Trophy is ours! 🏆",
    "Golden Pixel Claimed! 🪙",
    "It's coming home! 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "Japan fighting! 🇯🇵",
    "Base Network 🔵",
    "Curiosity unlocked. 🔑",
    "Legends live here! 🌟",
    "Viva España! 🇪🇸",
    "For Maradona 🇦🇷",
    "History in the making.",
    "First pixel minted! 🎨",
    "World Cup energy!",
    "Viva Mexico! 🇲🇽"
];

// 1. INITIALIZATION & DATA GENERATION

function getCoordinateSection(id) {
    const sectionsCount = 12;
    const sectionIndex = Math.floor(id / (state.totalCount / sectionsCount)) + 1;
    return `Pentagon ${sectionIndex}`;
}

function getCoordinates(id) {
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const phi = Math.acos(1.0 - 2.0 * (id + 0.5) / state.totalCount);
    const theta = 2.0 * Math.PI * id / goldenRatio;
    
    const x = (3.03 * Math.cos(theta) * Math.sin(phi) * 10).toFixed(1);
    const y = (3.03 * Math.sin(theta) * Math.sin(phi) * 10).toFixed(1);
    const z = (3.03 * Math.cos(phi) * 10).toFixed(1);
    
    return `X: ${x}, Y: ${y}, Z: ${z}`;
}

// Pre-fill pixel data
function initializePixelData() {
    const trophyIndices = [99, 299, 499, 699, 899, 1099, 1299, 1499, 1699, 1899];
    const championIndices = Array.from({ length: 20 }, (_, i) => 88 + i * 95);
    const captainIndices = Array.from({ length: 32 }, (_, i) => 45 + i * 61);
    const goldenIndices = Array.from({ length: 50 }, (_, i) => 12 + i * 39);

    for (let i = 0; i < state.totalCount; i++) {
        let rarity = 'NORMAL';
        if (trophyIndices.includes(i)) rarity = 'TROPHY';
        else if (championIndices.includes(i)) rarity = 'CHAMPION';
        else if (captainIndices.includes(i)) rarity = 'CAPTAIN';
        else if (goldenIndices.includes(i)) rarity = 'GOLDEN';

        const shouldBeMinted = i < state.mintedCount; 
        
        let minted = false;
        let owner = null;
        let color = '#ffffff';
        let team = null;
        let message = "";

        if (shouldBeMinted) {
            minted = true;
            
            const randWalletSuffix = Math.floor(1000 + Math.random() * 9000).toString(16);
            owner = `0x${Math.random() > 0.5 ? 'a3c' : '5b2'}...${randWalletSuffix}`;
            
            const country = countries[Math.floor(Math.random() * countries.length)];
            team = country.name;
            color = country.color;
            
            // Seed a random quote message
            message = supporterQuotes[Math.floor(Math.random() * supporterQuotes.length)];
        }

        state.pixels.push({
            id: i,
            minted: minted,
            owner: owner,
            color: color,
            rarity: rarity,
            team: team,
            message: message,
            listing: null
        });
    }
}

window.getPixelData = function(id) {
    return state.pixels[id];
};

// 2. WEB AUDIO API STADIUM CROWD SYNTHESIZER
const StadiumAudio = {
    ctx: null,
    lowPass: null,
    bandPass: null,
    ambientGain: null,
    cheerGain: null,
    noiseSource: null,
    chantsInterval: null,

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            const bufferSize = 2 * this.ctx.sampleRate;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            this.noiseSource = this.ctx.createBufferSource();
            this.noiseSource.buffer = noiseBuffer;
            this.noiseSource.loop = true;

            this.lowPass = this.ctx.createBiquadFilter();
            this.lowPass.type = 'lowpass';
            this.lowPass.frequency.setValueAtTime(320, this.ctx.currentTime);
            this.lowPass.Q.setValueAtTime(1.0, this.ctx.currentTime);

            this.bandPass = this.ctx.createBiquadFilter();
            this.bandPass.type = 'bandpass';
            this.bandPass.frequency.setValueAtTime(450, this.ctx.currentTime);
            this.bandPass.Q.setValueAtTime(0.5, this.ctx.currentTime);

            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            this.cheerGain = this.ctx.createGain();
            this.cheerGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            this.noiseSource.connect(this.lowPass);
            this.noiseSource.connect(this.bandPass);

            this.lowPass.connect(this.ambientGain);
            this.bandPass.connect(this.cheerGain);

            this.ambientGain.connect(this.ctx.destination);
            this.cheerGain.connect(this.ctx.destination);
            
            this.noiseSource.start(0);

            this.modulateAmbient();
            this.startStadiumChants();
            
            state.audioInitialized = true;
            return true;
        } catch (e) {
            console.error('Audio initialization failed', e);
            return false;
        }
    },

    modulateAmbient() {
        if (!state.audioPlaying) return;
        const now = this.ctx.currentTime;
        const nextVal = 0.02 + Math.random() * 0.04;
        const duration = 3 + Math.random() * 4;
        this.ambientGain.gain.exponentialRampToValueAtTime(nextVal, now + duration);
        
        setTimeout(() => this.modulateAmbient(), duration * 1000);
    },

    cheer() {
        if (!state.audioPlaying || !state.audioInitialized) return;
        const now = this.ctx.currentTime;
        
        this.lowPass.frequency.cancelScheduledValues(now);
        this.lowPass.frequency.setValueAtTime(320, now);
        this.lowPass.frequency.exponentialRampToValueAtTime(650, now + 0.3);
        this.lowPass.frequency.exponentialRampToValueAtTime(320, now + 4.5);

        this.cheerGain.gain.cancelScheduledValues(now);
        this.cheerGain.gain.setValueAtTime(0.01, now);
        this.cheerGain.gain.linearRampToValueAtTime(0.40, now + 0.25);
        this.cheerGain.gain.exponentialRampToValueAtTime(0.08, now + 2.5);
        this.cheerGain.gain.exponentialRampToValueAtTime(0.001, now + 5.0);

        this.playStadiumHorn();
    },

    playStadiumHorn() {
        if (!state.audioPlaying) return;
        const osc = this.ctx.createOscillator();
        const hornGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        
        osc.frequency.linearRampToValueAtTime(145, this.ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(138, this.ctx.currentTime + 1.2);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);

        hornGain.gain.setValueAtTime(0, this.ctx.currentTime);
        hornGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.1);
        hornGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.8);
        hornGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.8);

        osc.connect(filter);
        filter.connect(hornGain);
        hornGain.connect(this.ctx.destination);

        osc.start(0);
        osc.stop(this.ctx.currentTime + 2.0);
    },

    startStadiumChants() {
        const playKick = () => {
            if (!state.audioPlaying) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.frequency.setValueAtTime(80, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
            
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(0);
            osc.stop(this.ctx.currentTime + 0.35);
        };

        const sequence = [0, 400, 1000, 1400, 1800];
        let cycle = 0;

        this.chantsInterval = setInterval(() => {
            if (!state.audioPlaying) return;
            if (cycle % 4 === 0) {
                sequence.forEach(delay => {
                    setTimeout(playKick, delay);
                });
            }
            cycle++;
        }, 3000);
    },

    start() {
        if (!this.ctx) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        state.audioPlaying = true;
        const btn = document.getElementById('sound-toggle');
        btn.classList.add('sound-on');
        btn.querySelector('i').className = 'fa-solid fa-volume-high sound-icon';
        
        if (this.ambientGain) {
            this.ambientGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.ambientGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            this.ambientGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1.0);
        }
    },

    stop() {
        state.audioPlaying = false;
        const btn = document.getElementById('sound-toggle');
        btn.classList.remove('sound-on');
        btn.querySelector('i').className = 'fa-solid fa-volume-xmark sound-icon';
        
        if (this.ambientGain) {
            this.ambientGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.ambientGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        }
    }
};

document.getElementById('sound-toggle').addEventListener('click', () => {
    if (state.audioPlaying) {
        StadiumAudio.stop();
    } else {
        StadiumAudio.start();
    }
});


// 3. SIMULATED LIVE MINT FEED & TIMER
function startMintSimulation() {
    const runSimTick = () => {
        const available = state.pixels.filter(p => !p.minted);
        if (available.length === 0) {
            if (state.simTimer) clearTimeout(state.simTimer);
            return;
        }

        const randomAvailablePixel = available[Math.floor(Math.random() * available.length)];
        const country = countries[Math.floor(Math.random() * countries.length)];
        
        const walletHex = Math.floor(0x1000 + Math.random() * 0xefff).toString(16);
        const randomAddr = `0x${walletHex}...${Math.floor(1000 + Math.random() * 9000)}`;
        const randomQuote = supporterQuotes[Math.floor(Math.random() * supporterQuotes.length)];

        mintPixel(randomAvailablePixel.id, randomAddr, country.name, country.color, randomQuote);
        
        scheduleNextSim();
    };

    const scheduleNextSim = () => {
        if (state.simTimer) clearTimeout(state.simTimer);
        if (state.mintedCount >= state.totalCount) return;

        const delay = state.simSpeed === 'fast' ? 100 : (2000 + Math.random() * 6000);
        state.simTimer = setTimeout(runSimTick, delay);
    };

    scheduleNextSim();
}

function mintPixel(id, ownerAddress, teamName, hexColor, quoteText) {
    const pixel = state.pixels[id];
    if (!pixel || pixel.minted) return;

    pixel.minted = true;
    pixel.owner = ownerAddress;
    pixel.team = teamName;
    pixel.color = hexColor;
    pixel.message = quoteText || "Own a piece of history!";
    state.mintedCount++;

    if (window.updatePixelMinted3D) {
        window.updatePixelMinted3D(id, hexColor);
    }

    StadiumAudio.cheer();
    updateHUDProgress();
    addLiveFeedItem(id, ownerAddress, teamName, pixel.rarity);
    updateLeaderboardsHTML();

    if (state.mintedCount === state.totalCount) {
        trigger100PercentUnlock();
    }
}

function updateHUDProgress() {
    const percent = ((state.mintedCount / state.totalCount) * 100).toFixed(2);
    document.getElementById('progress-percent').innerText = `${percent}%`;
    document.getElementById('progress-ratio').innerText = `${state.mintedCount} / ${state.totalCount}`;
    
    document.getElementById('progress-bar-fill').style.width = `${percent}%`;
    document.getElementById('progress-bar-glow').style.width = `${percent}%`;
}

function addLiveFeedItem(pixelId, wallet, team, rarity) {
    const feed = document.getElementById('live-mint-feed');
    const item = document.createElement('div');
    item.className = 'feed-item';
    
    const countryObj = countries.find(c => c.name === team) || { flag: '⚽' };
    
    let isGoldClass = '';
    let iconHTML = `<i class="fa-solid fa-cube"></i>`;
    if (rarity === 'GOLDEN') {
        isGoldClass = ' gold-feed';
        iconHTML = `<i class="fa-solid fa-star"></i>`;
    } else if (rarity === 'CAPTAIN') {
        isGoldClass = ' gold-feed';
        iconHTML = `<i class="fa-solid fa-shield-halved"></i>`;
    } else if (rarity === 'CHAMPION') {
        isGoldClass = ' gold-feed';
        iconHTML = `<i class="fa-solid fa-trophy"></i>`;
    } else if (rarity === 'TROPHY') {
        isGoldClass = ' gold-feed';
        iconHTML = `<i class="fa-solid fa-crown"></i>`;
    }

    item.innerHTML = `
        <div class="feed-icon${isGoldClass}">
            ${iconHTML}
        </div>
        <div class="feed-info">
            <div class="feed-top">
                <span class="feed-addr">${wallet}</span>
                <span class="feed-time">just now</span>
            </div>
            <span class="feed-desc">Minted Pixel #${pixelId} (${rarity})</span>
        </div>
        <div class="feed-flag" title="Supporter: ${team}">${countryObj.flag}</div>
    `;

    feed.insertBefore(item, feed.firstChild);
    if (feed.children.length > 25) {
        feed.removeChild(feed.lastChild);
    }
}

function updateLeaderboardsHTML() {
    const countryCounts = {};
    countries.forEach(c => countryCounts[c.name] = 0);
    
    state.pixels.forEach(p => {
        if (p.minted && p.team) {
            countryCounts[p.team] = (countryCounts[p.team] || 0) + 1;
        }
    });

    const sortedCountries = Object.keys(countryCounts)
        .map(name => ({
            name: name,
            count: countryCounts[name],
            flag: countries.find(c => c.name === name).flag,
            color: countries.find(c => c.name === name).color
        }))
        .sort((a, b) => b.count - a.count);

    const countryList = document.getElementById('country-leaderboard');
    if (countryList) {
        countryList.innerHTML = sortedCountries.slice(0, 5).map((c, index) => `
            <div class="leaderboard-row">
                <div class="leaderboard-rank-info">
                    <span class="leaderboard-rank">${index + 1}</span>
                    <span class="leaderboard-name">${c.flag} ${c.name}</span>
                </div>
                <span class="leaderboard-value text-cyan">${c.count} px</span>
            </div>
        `).join('');
    }

    const teamRankings = document.getElementById('team-rankings');
    if (teamRankings) {
        const maxPixels = Math.max(...sortedCountries.map(c => c.count)) || 1;
        teamRankings.innerHTML = sortedCountries.slice(0, 6).map(c => {
            const pct = ((c.count / maxPixels) * 100).toFixed(0);
            return `
                <div class="team-rank-item">
                    <div class="team-rank-meta">
                        <span>${c.flag} ${c.name}</span>
                        <span class="text-muted">${c.count} pixels</span>
                    </div>
                    <div class="team-bar-outer">
                        <div class="team-bar-inner" style="width: ${pct}%; background-color: ${c.color};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const collectors = [
        { name: '0xBaseGod...90a', count: 47 },
        { name: '0xMinterPro...4f2', count: 35 },
        { name: '0xVitalikS...822', count: 29 },
        { name: '0xGigaChad...11a', count: 21 },
        { name: '0xNiftyFan...640', count: 18 }
    ];
    
    const userOwnedCount = state.pixels.filter(p => p.owner === state.userAddress).length;
    if (userOwnedCount > 0) {
        collectors.push({ name: 'You (0x71C...3a9)', count: userOwnedCount });
        collectors.sort((a, b) => b.count - a.count);
    }

    const collectorList = document.getElementById('collector-leaderboard');
    if (collectorList) {
        collectorList.innerHTML = collectors.slice(0, 5).map((col, index) => `
            <div class="leaderboard-row">
                <div class="leaderboard-rank-info">
                    <span class="leaderboard-rank">${index + 1}</span>
                    <span class="leaderboard-name">${col.name}</span>
                </div>
                <span class="leaderboard-value text-gold">${col.count} px</span>
            </div>
        `).join('');
    }
}


// 4. MINT & INTERACTIVE SELECTION

window.selectPixelUI = function(id) {
    state.selectedPixelId = id;
    const pixel = state.pixels[id];
    
    // Slide open drawer right automatically to focus inspector details
    const drawerRight = document.getElementById('drawer-right');
    drawerRight.classList.add('active');
    
    // Close left drawer to prevent mobile/iframe overlap
    const drawerLeft = document.getElementById('drawer-left');
    drawerLeft.classList.remove('active');
    document.getElementById('dock-btn-feed').classList.remove('active');

    // Switch right drawer to the inspector tab
    switchRightDrawerTab('inspector');

    document.getElementById('inspector-placeholder').style.display = 'none';
    document.getElementById('inspector-details').style.display = 'block';

    document.getElementById('inspect-pixel-name').innerText = `Pixel #${id}`;
    
    const rarityBadge = document.getElementById('inspect-pixel-rarity');
    rarityBadge.innerText = pixel.rarity;
    rarityBadge.className = `pixel-rarity-badge ${pixel.rarity.toLowerCase()}`;

    const statusBadge = document.getElementById('inspect-pixel-status');
    const actionsDiv = document.getElementById('inspector-actions');
    
    if (!pixel.minted) {
        statusBadge.innerText = 'AVAILABLE';
        statusBadge.className = 'pixel-status-badge available';
        
        actionsDiv.innerHTML = `
            <select class="select-glass" id="mint-team-select">
                <option value="" disabled selected>Support World Cup Team...</option>
                ${countries.map(c => `<option value="${c.name}">${c.flag} ${c.name}</option>`).join('')}
            </select>
            <input type="text" class="input-glass" id="mint-message-input" placeholder="Your handwritten quote (e.g. Go Messi!)..." maxlength="30" style="margin-bottom:0.5rem;">
            <button class="btn-premium" id="mint-now-btn">
                <i class="fa-solid fa-sparkles"></i> MINT PIXEL FOR $0.37
            </button>
        `;
        
        document.getElementById('mint-now-btn').addEventListener('click', () => {
            if (!state.walletConnected) {
                connectWallet();
                return;
            }
            const teamSelect = document.getElementById('mint-team-select');
            const selectedTeam = teamSelect.value;
            if (!selectedTeam) {
                alert('Please select a team to support before minting!');
                return;
            }
            const messageInput = document.getElementById('mint-message-input');
            const userMsg = messageInput.value.trim() || "Minted! ⚽";

            const countryObj = countries.find(c => c.name === selectedTeam);
            
            // Primary Mint
            mintPixel(id, state.userAddress, selectedTeam, countryObj.color, userMsg);
            
            window.selectPixelUI(id);
            state.userUSDC -= 0.37;
            updateWalletUI();
            console.log(`[Base Smart Contract] Transferred 0.37 USDC mint price to recipient: 0x324bf5bf2f2af900ea6c665a6e0f134d0affead2`);
        });

    } else {
        const isUserOwned = pixel.owner === state.userAddress;
        
        if (pixel.listing) {
            statusBadge.innerText = pixel.listing.type === 'auction' ? 'AUCTIONING' : 'LISTED';
            statusBadge.className = 'pixel-status-badge listed';
        } else {
            statusBadge.innerText = 'MINTED';
            statusBadge.className = 'pixel-status-badge minted';
        }

        const isFcAddress = pixel.owner.startsWith('0xFC');
        const displayOwner = isFcAddress && state.farcasterUser && pixel.owner === state.userAddress 
            ? `You (@${state.farcasterUser.username})` 
            : (pixel.owner === state.userAddress ? 'You (0x71C...3a9)' : pixel.owner);
            
        document.getElementById('inspect-pixel-owner').innerText = displayOwner;
        document.getElementById('inspect-pixel-team').innerText = pixel.team || 'None';

        if (isUserOwned) {
            if (pixel.listing) {
                actionsDiv.innerHTML = `<button class="btn-glass" id="cancel-listing-btn">CANCEL MARKET LISTING</button>`;
                document.getElementById('cancel-listing-btn').addEventListener('click', () => {
                    cancelMarketListing(id);
                });
            } else {
                actionsDiv.innerHTML = `
                    <div class="action-form-row">
                        <input type="number" class="input-glass" id="list-price-input" placeholder="Price in USDC" step="0.5" min="1">
                        <button class="btn-premium" id="list-sale-btn">LIST FOR SALE</button>
                    </div>
                    <div class="action-form-row">
                        <input type="number" class="input-glass" id="list-auc-input" placeholder="Min Bid USDC" step="0.5" min="1">
                        <button class="btn-glass text-gold" id="list-auction-btn">START AUCTION</button>
                    </div>
                `;
                
                document.getElementById('list-sale-btn').addEventListener('click', () => {
                    const price = parseFloat(document.getElementById('list-price-input').value);
                    if (isNaN(price) || price <= 0) return alert('Enter a valid price.');
                    listPixelForSale(id, price);
                });

                document.getElementById('list-auction-btn').addEventListener('click', () => {
                    const minBid = parseFloat(document.getElementById('list-auc-input').value);
                    if (isNaN(minBid) || minBid <= 0) return alert('Enter a valid minimum bid.');
                    listPixelForAuction(id, minBid);
                });
            }
        } else {
            if (pixel.listing) {
                if (pixel.listing.type === 'buy-now') {
                    actionsDiv.innerHTML = `
                        <button class="btn-premium" id="buy-pixel-btn">
                            BUY PIXEL NOW FOR $${pixel.listing.price} USDC
                        </button>
                    `;
                    document.getElementById('buy-pixel-btn').addEventListener('click', () => {
                        buyPixelFromMarket(id);
                    });
                } else {
                    actionsDiv.innerHTML = `
                        <div class="action-form-row">
                            <input type="number" class="input-glass" id="bid-amount-input" value="${(pixel.listing.currentBid || pixel.listing.price) + 0.5}" min="${(pixel.listing.currentBid || pixel.listing.price) + 0.5}">
                            <button class="btn-premium text-gold" id="place-bid-btn">PLACE BID</button>
                        </div>
                        <span class="dev-note" style="display:block; text-align:center;">Current High Bid: $${pixel.listing.currentBid || 'None'} USDC | Bids: ${pixel.listing.bidsCount}</span>
                    `;
                    
                    document.getElementById('place-bid-btn').addEventListener('click', () => {
                        const bid = parseFloat(document.getElementById('bid-amount-input').value);
                        placeBidOnAuction(id, bid);
                    });
                }
            } else {
                actionsDiv.innerHTML = `<button class="btn-glass" disabled>Secondary Trading Disabled (Not listed by owner)</button>`;
            }
        }
    }

    document.getElementById('inspect-pixel-section').innerText = getCoordinateSection(id);
    document.getElementById('inspect-pixel-coords').innerText = getCoordinates(id);
};

window.deselectPixelUI = function() {
    state.selectedPixelId = null;
    document.getElementById('inspector-placeholder').style.display = 'flex';
    document.getElementById('inspector-details').style.display = 'none';
};


// 5. UNIQUE HUMAN TOUCH: FLOATING STICKY NOTE TOOLTIP
window.showTooltipUI = function(id, clientX, clientY) {
    const tooltip = document.getElementById('custom-tooltip');
    const pixel = state.pixels[id];
    if (!tooltip || !pixel) return;

    // Populate data
    tooltip.querySelector('.tooltip-id').innerText = `Pixel #${id}`;
    
    const rarityLabel = tooltip.querySelector('.tooltip-rarity');
    rarityLabel.innerText = pixel.rarity;
    rarityLabel.className = `tooltip-rarity text-${pixel.rarity === 'NORMAL' ? 'muted' : pixel.rarity.toLowerCase()}`;
    
    const messageLabel = tooltip.querySelector('.tooltip-msg');
    const ownerLabel = tooltip.querySelector('.tooltip-owner');

    if (pixel.minted) {
        messageLabel.innerText = `"${pixel.message || 'Owner claimed!'}"`;
        let ownerCrop = pixel.owner === state.userAddress ? "You" : pixel.owner;
        if (state.farcasterUser && pixel.owner === state.userAddress) {
            ownerCrop = `@${state.farcasterUser.username} (You)`;
        }
        ownerLabel.innerText = `Owner: ${ownerCrop}`;
        tooltip.style.borderLeftColor = pixel.rarity === 'GOLDEN' ? 'var(--gold)' : (pixel.rarity === 'CAPTAIN' ? 'var(--cyan)' : 'var(--base-blue)');
    } else {
        messageLabel.innerText = `"Click to claim this spot! ⚽"`;
        ownerLabel.innerText = "Primary Mint: $0.37";
        tooltip.style.borderLeftColor = 'var(--text-muted)';
    }

    // Position near mouse (shifted up and centered)
    tooltip.style.left = `${clientX}px`;
    tooltip.style.top = `${clientY}px`;
    tooltip.classList.add('active');
};

window.hideTooltipUI = function() {
    const tooltip = document.getElementById('custom-tooltip');
    if (tooltip) {
        tooltip.classList.remove('active');
    }
};


// 6. WALLET SIMULATION
function connectWallet() {
    state.walletConnected = true;
    updateWalletUI();
    updateLeaderboardsHTML();
}

function updateWalletUI() {
    const disconnectedView = document.getElementById('wallet-disconnected-view');
    const connectedView = document.getElementById('wallet-connected-view');
    const headerBtnText = document.getElementById('wallet-btn-text');
    const headerBtn = document.getElementById('wallet-connect-btn');
    
    if (state.walletConnected) {
        disconnectedView.style.display = 'none';
        connectedView.style.display = 'block';
        
        if (state.farcasterUser) {
            headerBtn.innerHTML = `
                <img src="${state.farcasterUser.pfpUrl}" style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--cyan); object-fit: cover;" onerror="this.src='https://warpcast.com/avatar.png';">
                <span>@${state.farcasterUser.username}</span>
            `;
            headerBtn.className = 'header-btn btn-glass';
            document.getElementById('wallet-address-display').innerText = `@${state.farcasterUser.username}`;
        } else {
            headerBtnText.innerText = '0x71C2...3a9';
            headerBtn.className = 'header-btn btn-glass';
            document.getElementById('wallet-address-display').innerText = '0x71C2c3E5a9d28B15951804E19c362095f4b233a9';
        }
        
        document.getElementById('user-usdc-bal').innerText = `${state.userUSDC.toFixed(2)} USDC`;
        document.getElementById('user-eth-bal').innerText = `${state.userETH.toFixed(4)} ETH`;
    } else {
        disconnectedView.style.display = 'block';
        connectedView.style.display = 'none';
        if (headerBtnText) {
            headerBtn.innerHTML = `<i class="fa-solid fa-wallet"></i> <span id="wallet-btn-text">CONNECT WALLET</span>`;
        }
        headerBtn.className = 'header-btn btn-premium';
    }
}

if (document.getElementById('wallet-connect-btn')) {
    document.getElementById('wallet-connect-btn').addEventListener('click', () => {
        if (!state.walletConnected) {
            connectWallet();
        } else {
            state.walletConnected = false;
            updateWalletUI();
        }
    });
}


// 7. SECONDARY MARKETPLACE MODULE
function unlockSecondaryMarketplace() {
    state.marketplaceUnlocked = true;
    document.getElementById('marketplace-notice-pre').classList.remove('active');
    document.getElementById('marketplace-active-view').style.display = 'flex';
    document.getElementById('mkt-lock-badge').innerText = 'STAGES: LIVE Secondary';
    document.getElementById('mkt-lock-badge').className = 'marketplace-lock-badge text-cyan';
    
    seedSimulatedMarketplace();
    renderMarketplaceListings();
}

function seedSimulatedMarketplace() {
    const simulatedListingPrices = [5.5, 12.0, 8.0, 24.5];
    const simulatedListingIndices = [142, 599, 1205, 1680];
    
    simulatedListingIndices.forEach((pixelId, index) => {
        const p = state.pixels[pixelId];
        p.listing = {
            type: 'buy-now',
            price: simulatedListingPrices[index]
        };
    });

    const simulatedAuctionBids = [8.5, 15.0, 32.0, 4.0];
    const simulatedAuctionIndices = [105, 412, 1099, 1420];
    
    simulatedAuctionIndices.forEach((pixelId, index) => {
        const p = state.pixels[pixelId];
        p.listing = {
            type: 'auction',
            price: simulatedAuctionBids[index] - 2.0,
            currentBid: simulatedAuctionBids[index],
            bidsCount: 3,
            endTime: Date.now() + (3600 * 4 * 1000)
        };
    });
}

function renderMarketplaceListings() {
    const auctionsList = document.getElementById('mkt-auctions-list');
    const listingsList = document.getElementById('mkt-listings-list');
    const myPixelsList = document.getElementById('mkt-mypixels-list');
    
    const auctionItems = state.pixels.filter(p => p.minted && p.listing && p.listing.type === 'auction');
    const buyNowItems = state.pixels.filter(p => p.minted && p.listing && p.listing.type === 'buy-now');
    const myOwnedItems = state.pixels.filter(p => p.minted && p.owner === state.userAddress);

    if (auctionItems.length === 0) {
        auctionsList.innerHTML = `<span class="dev-note" style="display:block; text-align:center; padding: 1.5rem 0;">No active auctions</span>`;
    } else {
        auctionsList.innerHTML = auctionItems.map(p => `
            <div class="mkt-item-card" onclick="selectPixelUI(${p.id})">
                <div class="mkt-item-info">
                    <span class="mkt-item-title">Pixel #${p.id}</span>
                    <span class="mkt-item-sub">Rarity: ${p.rarity} | Bids: ${p.listing.bidsCount}</span>
                </div>
                <div class="mkt-item-pricing">
                    <span class="mkt-price-label">Current Bid</span>
                    <span class="mkt-price-val">$${p.listing.currentBid || p.listing.price} USDC</span>
                    <button class="btn-mkt-action">BID</button>
                </div>
            </div>
        `).join('');
    }

    if (buyNowItems.length === 0) {
        listingsList.innerHTML = `<span class="dev-note" style="display:block; text-align:center; padding: 1.5rem 0;">No pixels currently listed for sale</span>`;
    } else {
        listingsList.innerHTML = buyNowItems.map(p => `
            <div class="mkt-item-card" onclick="selectPixelUI(${p.id})">
                <div class="mkt-item-info">
                    <span class="mkt-item-title">Pixel #${p.id}</span>
                    <span class="mkt-item-sub">Rarity: ${p.rarity} | Owner: ${p.owner.substring(0, 10)}...</span>
                </div>
                <div class="mkt-item-pricing">
                    <span class="mkt-price-label">Buy Now</span>
                    <span class="mkt-price-val">$${p.listing.price} USDC</span>
                    <button class="btn-mkt-action">BUY</button>
                </div>
            </div>
        `).join('');
    }

    if (myOwnedItems.length === 0) {
        myPixelsList.innerHTML = `<span class="dev-note" style="grid-column: 1 / span 3; text-align:center; padding: 1.5rem 0;">You do not own any pixels yet. Mint some to trade them!</span>`;
    } else {
        myPixelsList.innerHTML = myOwnedItems.map(p => {
            let rarityClass = p.rarity.toLowerCase();
            if (p.rarity === 'CHAMPION') rarityClass = 'green';
            if (p.rarity === 'CAPTAIN') rarityClass = 'cyan';
            if (p.rarity === 'GOLDEN') rarityClass = 'gold';
            if (p.rarity === 'TROPHY') rarityClass = 'red';
            
            return `
                <div class="my-pixel-tile" onclick="selectPixelUI(${p.id})">
                    <span class="my-pixel-num">#${p.id}</span>
                    <span class="my-pixel-rarity ${rarityClass}">${p.rarity}</span>
                </div>
            `;
        }).join('');
    }
}

function listPixelForSale(id, price) {
    if (!state.walletConnected) return alert('Connect wallet first.');
    const p = state.pixels[id];
    if (p.owner !== state.userAddress) return;

    p.listing = {
        type: 'buy-now',
        price: price
    };

    renderMarketplaceListings();
    window.selectPixelUI(id);
}

function listPixelForAuction(id, minBid) {
    if (!state.walletConnected) return alert('Connect wallet first.');
    const p = state.pixels[id];
    if (p.owner !== state.userAddress) return;

    p.listing = {
        type: 'auction',
        price: minBid,
        currentBid: null,
        bidsCount: 0,
        endTime: Date.now() + (3600 * 24 * 1000)
    };

    renderMarketplaceListings();
    window.selectPixelUI(id);
}

function cancelMarketListing(id) {
    const p = state.pixels[id];
    if (p.owner !== state.userAddress) return;

    p.listing = null;
    renderMarketplaceListings();
    window.selectPixelUI(id);
}

function buyPixelFromMarket(id) {
    if (!state.walletConnected) return connectWallet();
    const p = state.pixels[id];
    if (!p.listing || p.listing.type !== 'buy-now') return;
    
    const price = p.listing.price;
    if (state.userUSDC < price) {
        alert('Insufficient USDC balance in connected wallet!');
        return;
    }

    state.userUSDC -= price;
    p.owner = state.userAddress;
    p.listing = null;
    
    updateWalletUI();
    renderMarketplaceListings();
    window.selectPixelUI(id);
    updateLeaderboardsHTML();

    alert(`Successfully bought Pixel #${id} from the marketplace!`);
}

function placeBidOnAuction(id, amount) {
    if (!state.walletConnected) return connectWallet();
    const p = state.pixels[id];
    if (!p.listing || p.listing.type !== 'auction') return;

    const minAllowed = (p.listing.currentBid || p.listing.price) + 0.5;
    if (amount < minAllowed) {
        alert(`Minimum bid allowed is $${minAllowed} USDC.`);
        return;
    }

    if (state.userUSDC < amount) {
        alert('Insufficient USDC balance!');
        return;
    }

    p.listing.currentBid = amount;
    p.listing.bidsCount++;

    renderMarketplaceListings();
    window.selectPixelUI(id);

    if (p.owner !== state.userAddress) {
        setTimeout(() => {
            if (p.listing && p.listing.currentBid === amount) {
                const outbidAmount = amount + Math.floor(1 + Math.random() * 4);
                p.listing.currentBid = outbidAmount;
                p.listing.bidsCount++;
                
                if (state.selectedPixelId === id) {
                    window.selectPixelUI(id);
                }
                renderMarketplaceListings();
                StadiumAudio.cheer();
            }
        }, 8000);
    }
}


// 8. DEVELOPER DEBUG CONTROLS
function initDevPanel() {
    const devToggle = document.getElementById('dev-toggle-btn');
    const devPanel = document.querySelector('.dev-control-panel');
    
    if (devToggle && devPanel) {
        devToggle.addEventListener('click', () => {
            devPanel.classList.toggle('collapsed');
            devToggle.querySelector('i').className = devPanel.classList.contains('collapsed') 
                ? 'fa-solid fa-chevron-down' 
                : 'fa-solid fa-chevron-up';
        });
    }

    if (document.getElementById('dev-mint-10')) {
        document.getElementById('dev-mint-10').addEventListener('click', () => {
            simulateBatchMints(10);
        });
    }

    if (document.getElementById('dev-fast-forward')) {
        document.getElementById('dev-fast-forward').addEventListener('click', () => {
            fastForwardToSellout();
        });
    }

    if (document.getElementById('dev-toggle-mint-speed')) {
        document.getElementById('dev-toggle-mint-speed').addEventListener('click', () => {
            const btn = document.getElementById('dev-toggle-mint-speed');
            if (state.simSpeed === 'normal') {
                state.simSpeed = 'fast';
                btn.innerText = 'Speed: FAST (100ms)';
                btn.style.borderColor = 'var(--cyan)';
            } else {
                state.simSpeed = 'normal';
                btn.innerText = 'Speed: Normal';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
            startMintSimulation();
        });
    }
}

function simulateBatchMints(count) {
    let mintsLeft = count;
    const interval = setInterval(() => {
        const available = state.pixels.filter(p => !p.minted);
        if (available.length === 0 || mintsLeft <= 0) {
            clearInterval(interval);
            return;
        }

        const p = available[Math.floor(Math.random() * available.length)];
        const country = countries[Math.floor(Math.random() * countries.length)];
        const walletHex = Math.floor(0x1000 + Math.random() * 0xefff).toString(16);
        const randomAddr = `0x${walletHex}...${Math.floor(1000 + Math.random() * 9000)}`;
        const randomQuote = supporterQuotes[Math.floor(Math.random() * supporterQuotes.length)];

        mintPixel(p.id, randomAddr, country.name, country.color, randomQuote);
        mintsLeft--;
    }, 100);
}

function fastForwardToSellout() {
    const target = 1996;
    const available = state.pixels.filter(p => !p.minted);
    
    if (state.mintedCount >= target) return;

    const toMint = available.slice(0, target - state.mintedCount);
    
    toMint.forEach(p => {
        const country = countries[Math.floor(Math.random() * countries.length)];
        const walletHex = Math.floor(0x1000 + Math.random() * 0xefff).toString(16);
        const randomAddr = `0x${walletHex}...${Math.floor(1000 + Math.random() * 9000)}`;
        const randomQuote = supporterQuotes[Math.floor(Math.random() * supporterQuotes.length)];
        
        p.minted = true;
        p.owner = randomAddr;
        p.team = country.name;
        p.color = country.color;
        p.message = randomQuote;
        
        if (window.updatePixelMinted3D) {
            window.updatePixelMinted3D(p.id, country.color);
        }
    });

    state.mintedCount = target;
    updateHUDProgress();
    updateLeaderboardsHTML();
    
    addLiveFeedItem(1993, '0x9d2...8831', 'Brazil', 'NORMAL');
    addLiveFeedItem(1994, '0x2a1...4912', 'France', 'NORMAL');
    addLiveFeedItem(1995, '0xf39...0024', 'Germany', 'GOLDEN');

    state.simSpeed = 'normal';
    document.getElementById('dev-toggle-mint-speed').innerText = 'Speed: Normal';
    document.getElementById('dev-toggle-mint-speed').style.borderColor = 'rgba(255, 255, 255, 0.1)';
    startMintSimulation();

    alert('Fast-forwarded to 99.80%! 4 pixels remain. Connect wallet and mint them manually to trigger the 100% Celebration!');
}


// 9. 100% COMMUNITY UNLOCK CELEBRATION
function trigger100PercentUnlock() {
    if (window.trigger100PercentCelebration3D) {
        window.trigger100PercentCelebration3D();
    }

    unlockSecondaryMarketplace();

    setTimeout(() => {
        const modal = document.getElementById('celebration-modal');
        modal.classList.add('active');
        populatePaintDropdown();
    }, 1500);
}

function populatePaintDropdown() {
    const dropdown = document.getElementById('paint-pixel-dropdown');
    const myOwnedItems = state.pixels.filter(p => p.minted && p.owner === state.userAddress);

    if (myOwnedItems.length === 0) {
        dropdown.innerHTML = `<option value="" disabled>You don't own any pixels to paint</option>`;
        document.getElementById('apply-paint-btn').disabled = true;
    } else {
        dropdown.innerHTML = myOwnedItems.map(p => `
            <option value="${p.id}">Pixel #${p.id} (${p.rarity})</option>
        `).join('');
        document.getElementById('apply-paint-btn').disabled = false;
    }
}

if (document.getElementById('apply-paint-btn')) {
    document.getElementById('apply-paint-btn').addEventListener('click', () => {
        const dropdown = document.getElementById('paint-pixel-dropdown');
        const pixelId = parseInt(dropdown.value);
        
        if (isNaN(pixelId)) return;

        const colorPicker = document.getElementById('paint-color-picker');
        const chosenColor = colorPicker.value;

        const pixel = state.pixels[pixelId];
        pixel.color = chosenColor;
        pixel.message = "Painted live monument! 🎨";
        
        if (window.updatePixelMinted3D) {
            window.updatePixelMinted3D(pixelId, chosenColor);
        }
        
        const displayUser = state.farcasterUser ? `@${state.farcasterUser.username}` : 'You (0x71C...3a9)';
        addLiveFeedItem(pixelId, displayUser, pixel.team, `${pixel.rarity} - Painted!`);
        StadiumAudio.cheer();

        alert(`Successfully applied paint to Pixel #${pixelId}! Watch it glow in real-time on the 3D football.`);
    });
}

document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
        const hex = e.target.getAttribute('data-color');
        document.getElementById('paint-color-picker').value = hex;
    });
});

if (document.getElementById('close-celebration-btn')) {
    document.getElementById('close-celebration-btn').addEventListener('click', () => {
        document.getElementById('celebration-modal').classList.remove('active');
    });
}

if (document.getElementById('enter-monument-btn')) {
    document.getElementById('enter-monument-btn').addEventListener('click', () => {
        document.getElementById('celebration-modal').classList.remove('active');
    });
}


// 10. DRAWER NAVIGATION & BOTTOM DOCK EVENT CONTROLLER

function switchRightDrawerTab(tabName) {
    const drawerRight = document.getElementById('drawer-right');
    const tabs = document.querySelectorAll('#right-panel-tabs .tab-btn');
    
    // Remove active classes
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Add active class to clicked tab
    const targetTab = document.getElementById(`right-tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');
    
    // Update drawer classes
    drawerRight.classList.remove('show-wallet', 'show-inspector', 'show-marketplace');
    drawerRight.classList.add(`show-${tabName}`);
    
    // Sync bottom dock button highlight states
    const dockBtnWallet = document.getElementById('dock-btn-wallet');
    const dockBtnMkt = document.getElementById('dock-btn-mkt');
    
    if (drawerRight.classList.contains('active')) {
        if (tabName === 'wallet') {
            dockBtnWallet.classList.add('active');
            dockBtnMkt.classList.remove('active');
        } else if (tabName === 'marketplace') {
            dockBtnMkt.classList.add('active');
            dockBtnWallet.classList.remove('active');
        } else {
            // Inspector tab doesn't have an exclusive dock button, deselect both
            dockBtnWallet.classList.remove('active');
            dockBtnMkt.classList.remove('active');
        }
    } else {
        dockBtnWallet.classList.remove('active');
        dockBtnMkt.classList.remove('active');
    }
}

function setupDrawerAndDockNavigation() {
    const drawerLeft = document.getElementById('drawer-left');
    const drawerRight = document.getElementById('drawer-right');

    const dockBtnChalk = document.getElementById('dock-btn-chalk');
    const dockBtnFeed = document.getElementById('dock-btn-feed');
    const dockBtnWallet = document.getElementById('dock-btn-wallet');
    const dockBtnMkt = document.getElementById('dock-btn-mkt');

    const chalkAnnotations = document.getElementById('chalk-annotations');

    // Tab buttons in right drawer
    document.querySelectorAll('#right-panel-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-right-tab');
            switchRightDrawerTab(tabName);
        });
    });

    // Close buttons inside drawers
    document.getElementById('close-left-drawer').addEventListener('click', () => {
        drawerLeft.classList.remove('active');
        dockBtnFeed.classList.remove('active');
    });

    document.getElementById('close-right-drawer').addEventListener('click', () => {
        drawerRight.classList.remove('active');
        dockBtnWallet.classList.remove('active');
        dockBtnMkt.classList.remove('active');
    });

    // Dock Button: Chalkboard play diagrams show/hide
    dockBtnChalk.addEventListener('click', () => {
        dockBtnChalk.classList.toggle('active');
        chalkAnnotations.classList.toggle('hidden');
    });

    // Dock Button: Feed & leaderboards
    dockBtnFeed.addEventListener('click', () => {
        const wasActive = drawerLeft.classList.contains('active');
        
        // Close right drawer to prevent overlapping sheets on mobile/iframes
        drawerRight.classList.remove('active');
        dockBtnWallet.classList.remove('active');
        dockBtnMkt.classList.remove('active');
        
        if (wasActive) {
            drawerLeft.classList.remove('active');
            dockBtnFeed.classList.remove('active');
        } else {
            drawerLeft.classList.add('active');
            dockBtnFeed.classList.add('active');
        }
    });

    // Dock Button: My Wallet
    dockBtnWallet.addEventListener('click', () => {
        const wasActive = drawerRight.classList.contains('active') && drawerRight.classList.contains('show-wallet');
        
        // Close left drawer
        drawerLeft.classList.remove('active');
        dockBtnFeed.classList.remove('active');
        
        if (wasActive) {
            drawerRight.classList.remove('active');
            dockBtnWallet.classList.remove('active');
        } else {
            drawerRight.classList.add('active');
            switchRightDrawerTab('wallet');
        }
    });

    // Dock Button: Marketplace
    dockBtnMkt.addEventListener('click', () => {
        const wasActive = drawerRight.classList.contains('active') && drawerRight.classList.contains('show-marketplace');
        
        // Close left drawer
        drawerLeft.classList.remove('active');
        dockBtnFeed.classList.remove('active');
        
        if (wasActive) {
            drawerRight.classList.remove('active');
            dockBtnMkt.classList.remove('active');
        } else {
            drawerRight.classList.add('active');
            switchRightDrawerTab('marketplace');
        }
    });
}


// 11. FARCASTER MINI-APP SDK COMPATIBILITY HANDLERS
function initFarcasterFrameSDK() {
    if (window.frame && window.frame.sdk) {
        console.log("Farcaster Frame SDK detected. Initializing...");
        window.frame.sdk.actions.ready().then(() => {
            console.log("Farcaster Frame SDK initialized successfully.");
            
            // Retrieve Farcaster Context
            const context = window.frame.sdk.context;
            if (context && context.user) {
                const fcUser = context.user;
                
                // Save Farcaster User Details to App State
                state.farcasterUser = {
                    fid: fcUser.fid,
                    username: fcUser.username || `fid-${fcUser.fid}`,
                    displayName: fcUser.displayName || `FID ${fcUser.fid}`,
                    pfpUrl: fcUser.pfpUrl || 'https://warpcast.com/avatar.png'
                };
                
                // Safe log to prevent TypeError: Cannot convert object to primitive value
                try {
                    console.log("Farcaster User context loaded:", JSON.stringify(state.farcasterUser));
                } catch (e) {
                    console.log("Farcaster User context loaded (safe):", state.farcasterUser.username);
                }
                
                // Auto-connect simulated Web3 wallet derived deterministically from their FID
                state.walletConnected = true;
                const fidHex = fcUser.fid.toString(16).padStart(4, '0');
                state.userAddress = `0xFC${fidHex}000000000000000000000000000000000${fidHex}`;
                
                // Update UI to welcome Farcaster identity
                displayFarcasterUserWelcome();
            }
        }).catch(err => {
            console.error("Farcaster Frame SDK ready() failed:", err);
        });
    } else {
        console.log("Not running in Farcaster context. Standalone Web3 simulation active.");
    }
}

function displayFarcasterUserWelcome() {
    const fc = state.farcasterUser;
    if (!fc) return;
    
    // Update header wallet connector
    const btn = document.getElementById('wallet-connect-btn');
    if (btn) {
        btn.innerHTML = `
            <img src="${fc.pfpUrl}" style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--cyan); object-fit: cover;" onerror="this.src='https://warpcast.com/avatar.png';">
            <span>@${fc.username}</span>
        `;
        btn.className = 'header-btn btn-glass';
    }
    
    // Update Wallet Module inside Right Drawer
    const connectedView = document.getElementById('wallet-connected-view');
    const disconnectedView = document.getElementById('wallet-disconnected-view');
    
    if (disconnectedView && connectedView) {
        disconnectedView.style.display = 'none';
        connectedView.style.display = 'block';
        
        const userAvatar = connectedView.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = `<img src="${fc.pfpUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.innerHTML='<i class=\'fa-solid fa-user-shield\'></i>';">`;
        }
        
        const walletAddressDisplay = document.getElementById('wallet-address-display');
        if (walletAddressDisplay) {
            walletAddressDisplay.innerText = `@${fc.username}`;
        }
        
        const walletNetwork = connectedView.querySelector('.wallet-network');
        if (walletNetwork) {
            walletNetwork.innerHTML = `<i class="fa-solid fa-bolt" style="color: #8a63d2;"></i> Farcaster Network`;
        }
        
        // Sync Balances display
        const userUsdcBal = document.getElementById('user-usdc-bal');
        if (userUsdcBal) userUsdcBal.innerText = `${state.userUSDC.toFixed(2)} USDC`;
        
        const userEthBal = document.getElementById('user-eth-bal');
        if (userEthBal) userEthBal.innerText = `${state.userETH.toFixed(4)} ETH`;
    }
    
    // Chalkboard strategy arrow coach greeting (Unique Human Touch!)
    const chalkTextEl = document.querySelector('#chalk-annotations text.text-gold');
    if (chalkTextEl) {
        chalkTextEl.textContent = `Let's win this, @${fc.username}!`;
    }
    
    updateLeaderboardsHTML();
}


// 12. ON DOM LOAD INIT
window.addEventListener('DOMContentLoaded', () => {
    initializePixelData();
    updateHUDProgress();
    updateWalletUI();
    updateLeaderboardsHTML();
    initDevPanel();
    setupDrawerAndDockNavigation();
    
    // Initialize right drawer show-mode
    switchRightDrawerTab('inspector');
    
    startMintSimulation();
    
    // Auto-detect & initialize Farcaster Frame SDK
    initFarcasterFrameSDK();
    
    // Set up tabs switching in left sidebar
    document.querySelectorAll('.drawer-left .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.drawer-left .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.drawer-left .panel-tab-content').forEach(c => c.classList.remove('active'));
            
            const tabId = e.target.getAttribute('data-tab');
            e.target.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Set up tabs switching in right sidebar marketplace
    document.querySelectorAll('.mkt-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mkt-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.mkt-tab-content').forEach(c => c.classList.remove('active'));
            
            const tabId = e.target.getAttribute('data-mkt-tab');
            e.target.classList.add('active');
            document.getElementById(`mkt-${tabId}-tab`).classList.add('active');
        });
    });
});
