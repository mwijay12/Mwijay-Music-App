
import type { Song, ProfileData } from '../types.ts';
import type { AppControls } from './useAssistant.ts';

interface CommandContext {
    appState: {
        nowPlaying: Song | null;
        isPlaying: boolean;
        librarySongs: Song[];
        isSimpleMode: boolean;
        profile: ProfileData;
        isShuffled: boolean;
        repeatMode: 'none' | 'one' | 'all';
        playQueue: Song[];
        currentQueueIndex: number;
    };
    controls: AppControls;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
    command: string;
}

type ResponseGenerator = (context: CommandContext, params?: any) => string | Promise<string>;

const responses = {
    affirmative: ["You got it.", "Sure thing.", "Consider it done.", "On it!", "No problem.", "Done.", "Safi."],
    playing: ["Spinning that track.", "Dropping the beat.", "Playing now.", "Here's your song."],
    searching: ["Checking the library...", "Looking for that one...", "Searching now."],
    error: ["I couldn't find that.", "Something went wrong.", "I didn't quite catch that."],
};

const getRandomResponse = (type: keyof typeof responses) => {
    const list = responses[type];
    return list[Math.floor(Math.random() * list.length)];
};

const commandPatterns: { pattern: RegExp, action: ResponseGenerator }[] = [
    // Playback
    { pattern: /^(play|pause|stop|resume)( music)?$/, action: (context) => {
        if (context.command.match(/play|resume/) && context.appState.isPlaying) return "Music is already playing!";
        if (context.command.match(/pause|stop/) && !context.appState.isPlaying) return "Music is already paused.";
        context.controls.togglePlay();
        return context.command.match(/play|resume/) ? "Resuming playback." : "Paused.";
    }},
    { pattern: /^(next|skip)( song| track)?$/, action: ({ controls }) => { controls.playNext(); return getRandomResponse('affirmative'); }},
    { pattern: /^(previous|back)( song| track)?$/, action: ({ controls }) => { controls.playPrev(); return "Rewinding..."; }},
    { pattern: /^play songs by (.+)$/, action: ({ controls }, params) => {
        const artist = params[0];
        controls.playArtist({ artistName: artist });
        return `Playing songs by ${artist}.`;
    }},
    { pattern: /^play (.+)$/, action: (context, params) => {
        const query = params[0];
        if (query.toLowerCase().includes('ai playlist')) {
            context.controls.playAiPlaylist();
            return "Cooking up an AI playlist just for you.";
        }
        const libraryArtists = new Set(context.appState.librarySongs.map(s => s.artist.toLowerCase()));
        if (libraryArtists.has(query.toLowerCase())) {
             context.controls.playArtist({ artistName: query });
             return `Playing songs by ${query}.`;
        }
        context.controls.onPlaySong({ query, source: 'local' });
        return `${getRandomResponse('searching')} for "${query}".`;
    }},
    { pattern: /^add (.+) to (the )?queue$/, action: ({ controls }, params) => { controls.addToQueue({ songTitle: params[0] }); return `Added "${params[0]}" to the queue.`; }},
    { pattern: /^(toggle )?shuffle( on| off| toggle)?$/i, action: ({ controls }) => { controls.toggleShuffle(); return "Shuffle mode toggled."; }},
    { pattern: /^(clear|empty) (queue|play queue)$/, action: ({ controls }) => { controls.clearQueue(); return "Queue cleared."; }},
    
    // Context
    { pattern: /^what (song|track) is (this|playing|that)( called)?\??$/, action: ({ appState }) => {
        if (!appState.nowPlaying) return "Nothing is playing right now.";
        return `This is "${appState.nowPlaying.title}" by ${appState.nowPlaying.artist}.`;
    }},

    // EQ Control (Voice)
    { pattern: /^(boost|increase|more) (bass|lows)$/, action: ({ controls }) => {
        return controls.setEqualizer({ low: 5 });
    }},
    { pattern: /^(cut|decrease|less) (bass|lows)$/, action: ({ controls }) => {
        return controls.setEqualizer({ low: -5 });
    }},
    { pattern: /^(boost|increase|more) (treble|highs|vocals)$/, action: ({ controls }) => {
        return controls.setEqualizer({ high: 5 });
    }},
    { pattern: /^(reset|flat) (eq|equalizer)$/, action: ({ controls }) => {
        return controls.setEqualizer({ low: 0, mid: 0, high: 0 });
    }},
    { pattern: /^(open|show) equalizer$/i, action: ({ controls }) => {
        controls.openAudioEffects();
        return "Opening Equalizer and Audio Effects.";
    }},

    // Playlist Management
    { pattern: /^create (?:a )?playlist (?:called |named )?(.+)$/i, action: ({ controls }, params) => {
        controls.createPlaylist({ name: params[0] });
        return `New playlist "${params[0]}" created.`;
    }},
    { pattern: /^add (.+?) to (?:playlist )?(.+)$/i, action: ({ controls }, params) => {
        controls.addSongToPlaylist({ songTitle: params[0], playlistName: params[1] });
        return `Adding "${params[0]}" to playlist "${params[1]}".`;
    }},
    { pattern: /^(delete|remove) (song|track)? ?(.+)$/i, action: ({ controls }, params) => {
        return controls.deleteSong({ songTitle: params[2] });
    }},
    { pattern: /^(like|unlike) (this |that )?(song|track)$/, action: ({ controls }) => {
        controls.toggleFavorite();
        return "Toggled favorite status.";
    }},

    // Deep Settings & Controls
    { pattern: /^set crossfade to (\d+(\.\d+)?)(s| seconds)?$/, action: ({ controls }, params) => {
        const val = parseFloat(params[0]);
        controls.setCrossfade({ value: val });
        return `Crossfade set to ${val} seconds.`;
    }},
    { pattern: /^(turn on|enable) (volume normalizer|normalization)$/, action: ({ controls }) => {
        controls.setVolumeNormalization({ enabled: true });
        return "Volume normalization enabled.";
    }},
    { pattern: /^(turn off|disable) (volume normalizer|normalization)$/, action: ({ controls }) => {
        controls.setVolumeNormalization({ enabled: false });
        return "Volume normalization disabled.";
    }},
    { pattern: /^(turn on|enable|set) (reels|auto) scroll (to )?(\d+) (loops|loop)?$/, action: ({ controls }, params) => {
        const loops = parseInt(params[3]);
        return controls.setReelsAutoScroll({ loops });
    }},
    { pattern: /^(turn on|enable) (player idle|idle ui)$/, action: ({ controls }) => {
        return controls.toggleSetting({ settingName: 'playerIdleUiEnabled', value: true });
    }},
    { pattern: /^(turn off|disable) (player idle|idle ui)$/, action: ({ controls }) => {
        return controls.toggleSetting({ settingName: 'playerIdleUiEnabled', value: false });
    }},
    { pattern: /^(turn on|enable) (ai cover art|cover gen)$/, action: ({ controls }) => {
        return controls.toggleSetting({ settingName: 'aiCoverArtEnabled', value: true });
    }},
    { pattern: /^(turn on|enable) (audible greeting|greeting)$/, action: ({ controls }) => {
        return controls.toggleSetting({ settingName: 'assistant.audibleGreeting', value: true });
    }},
    { pattern: /^(turn off|disable) (audible greeting|greeting)$/, action: ({ controls }) => {
        return controls.toggleSetting({ settingName: 'assistant.audibleGreeting', value: false });
    }},
    { pattern: /^(turn on|enable) (read responses|speak responses)$/, action: ({ controls }) => {
        return controls.toggleSetting({ settingName: 'assistant.readResponses', value: true });
    }},
    { pattern: /^(turn off|disable) (read responses|speak responses)$/, action: ({ controls }) => {
        return controls.toggleSetting({ settingName: 'assistant.readResponses', value: false });
    }},

    // Navigation with Countdown & Direct
    { pattern: /^(go to|open|take me to) (library|settings|reels|explore|home|radio)( with countdown)?$/, action: ({ controls }, params) => {
        const view = params[1].charAt(0).toUpperCase() + params[1].slice(1);
        return controls.navigateToViewWithCountdown({ viewName: view });
    }},
    { pattern: /^(open|go to|view) (profile|my profile)$/, action: ({ controls }) => {
        controls.openProfile();
        return "Opening profile.";
    }},
    { pattern: /^(open|go to) (assistant settings|ai settings)$/, action: ({ controls }) => {
        return controls.navigateToViewWithCountdown({ viewName: 'AssistantSettings' });
    }},
    
    // Fun Features
    { pattern: /^(start|play|open) (music )?quiz$/, action: ({ controls }) => {
        controls.startMusicQuiz();
        return "Starting Music Quiz! Get ready.";
    }},
    { pattern: /^(start|enable) (party|guest) mode$/, action: ({ controls }) => {
        controls.startPartyMode();
        return "Let's get this party started! Enabling Guest Mode.";
    }},
    { pattern: /^(show|open|toggle) (lyrics|words)$/, action: ({ controls }) => {
        controls.toggleLyrics();
        return "Toggling lyrics view.";
    }},
    { pattern: /^(change|set) visualizer (to )?(.+)$/, action: ({ controls }, params) => {
        const type = params[2].toLowerCase().replace(/ /g, '-');
        const validTypes = ['spectral', 'galaxy', 'tunnel', 'particles', 'vortex', 'stardust', 'equalizer', 'flow', 'neon-grid', 'metropolis'];
        if (validTypes.includes(type)) {
            controls.setVisualizerType({ type });
            return `Visualizer changed to ${type}.`;
        }
        return "I don't know that visualizer. Try spectral, galaxy, or tunnel.";
    }},
    { pattern: /^(open|show) (visualizer settings|visualizer options)$/, action: ({ controls }) => {
        controls.openVisualizerSettings();
        return "Opening visualizer settings.";
    }},
    
    // Analytics
    { pattern: /^(show|tell me|what are) (my )?(stats|analytics|achievements)$/, action: ({ controls }) => {
        return controls.getAnalytics({ type: 'summary' });
    }},
    { pattern: /^what achievement(s)? have i achieved( so far)?$/i, action: ({ controls }) => {
        return controls.getAnalytics({ type: 'achievements' });
    }},
    { pattern: /^(explain lyrics|what does this song mean|explain song|meaning of this song)$/, action: async ({ controls }) => {
        return await controls.explainLyrics();
    }},
    { pattern: /^translate (lyrics|song) to (english|swahili|kiswahili)$/, action: async ({ controls }, params) => {
        const lang = params[1].toLowerCase().startsWith('sw') || params[1].toLowerCase().startsWith('ki') ? 'Swahili' : 'English';
        return await controls.translateLyrics({ targetLanguage: lang });
    }},

    // Themes & Appearance
    { pattern: /^(switch to|set|apply) (light|dark) theme$/, action: (context, params) => {
        context.controls.setThemeMode({ mode: params[1] as 'light' | 'dark' });
        return `Switched to ${params[1]} mode.`;
    }},
    { pattern: /^(set|change|apply) theme to (.+)$/, action: ({ controls }, params) => {
        controls.applyThemeByName({ themeName: params[1] });
        return `${getRandomResponse('affirmative')} Applied theme.`;
    }},
    { pattern: /^change (font|text) to (.+)$/, action: ({ controls }, params) => {
        controls.changeFont({ fontName: params[1] });
        return `Font changed to ${params[1]}.`;
    }},
    { pattern: /^change nameplate (animation|style) to (.+)$/, action: ({ controls }) => {
        controls.navigateToViewWithCountdown({ viewName: 'Appearance' });
        return "Opening Appearance settings to change nameplate animation.";
    }},
    
    // Mwijay Davie Branding, Services, Contacts, Social Media Strategy, and Remote Jobs
    { pattern: /.*(who is mwijay|mwijay davie|about mwijay|developer|mastermind).*/i, action: () => {
        return `**Mwijay Davie** is a professional Freelance Developer, Automation Specialist, and Tech & Business Consultant. He is the mastermind who built this premium music application! 🚀\n\nHe specializes in building high-vibe digital products, AI systems, and business automation workflows that help companies and creators scale. Check out his services by asking me about **"services"** or **"pricing"**!`;
    }},
    { pattern: /.*(services|pricing|price|packages|cost|rates|maintenance|website|automation|chatbot).*/i, action: () => {
        return `Here is the premium service catalog and pricing by **Mwijay Davie**:\n\n` +
               `🌐 **WEBSITES & WEB SYSTEMS (Tovuti na Mifumo ya Wavuti)**\n` +
               `• **Landing Page (Ukurasa wa Kutangaza)**: TZS 150,000 – 300,000 ($55 – $110) | 3–5 days\n` +
               `  *Includes: 1 page mobile responsive, Contact form, WhatsApp integration, Firebase hosting*\n` +
               `• **Business Website (Tovuti ya Biashara)**: TZS 400,000 – 700,000 ($150 – $260) | 1–2 weeks\n` +
               `  *Includes: 5 pages, Mobile responsive, Firebase hosting, WhatsApp integration, Custom domain setup*\n` +
               `• **E-Commerce Store (Duka la Mtandaoni)**: TZS 800,000 – 1,500,000 ($300 – $560) | 2–4 weeks\n` +
               `  *Includes: Product catalog, Shopping cart, M-Pesa integration, Firebase backend, Admin dashboard*\n` +
               `• **Web Application (Mfumo wa Wavuti)**: TZS 1,500,000 – 4,000,000 ($560 – $1,500) | 4–8 weeks\n` +
               `  *Includes: Custom full-stack system, User auth, Database, Admin panel, 1 month support*\n\n` +
               `🤖 **AUTOMATIONS (Otomatiki & Workflows)**\n` +
               `• **Simple Automation (Otomatiki Ndogo)**: TZS 100,000 – 250,000 ($38 – $93) | 1–3 days\n` +
               `  *Includes: 1 workflow, WhatsApp auto-reply or email, Google Sheets synchronization*\n` +
               `• **Business Package (Pakiti ya Otomatiki)**: TZS 400,000 – 800,000 ($150 – $300) | 1–2 weeks\n` +
               `  *Includes: 3–5 workflows, CRM integration, lead capture, social media scheduling, reporting*\n` +
               `• **Full System (Mfumo Kamili)**: TZS 1,000,000 – 2,500,000 ($375 – $935) | 2–4 weeks\n` +
               `  *Includes: Unlimited workflows, AI integration, advanced chatbot, monthly maintenance*\n\n` +
               `🧠 **AI SYSTEMS (Mifumo ya AI)**\n` +
               `• **Telegram AI Chatbot (Roboti ya Telegram)**: TZS 300,000 – 600,000 ($112 – $224) | 1–2 weeks\n` +
               `  *Includes: 24/7 customer service, Swahili & English support, Lead capture, Human handoff capability*\n` +
               `• **Full AI System (Mfumo Kamili wa AI)**: TZS 800,000 – 2,000,000 ($300 – $750) | 2–4 weeks\n` +
               `  *Includes: AI + Automation + Custom website, full digital business transformation, 1 month support*\n\n` +
               `🔧 **MAINTENANCE & SUPPORT (Matengenezo na Usaidizi)**\n` +
               `• **Basic Support (Msaada wa Msingi)**: TZS 50,000/month ($19/month)\n` +
               `  *Includes: Bug fixes, minor content updates, email support*\n` +
               `• **Full Maintenance (Matengenezo Kamili)**: TZS 150,000/month ($56/month)\n` +
               `  *Includes: All system updates, priority support, detailed monthly reports*`;
    }},
    { pattern: /.*(contact|email|phone|number|whatsapp|call|reach).*/i, action: () => {
        return `You can reach **Mwijay Davie** directly for projects, consultations, or collaborations:\n\n` +
               `📧 **Email**: mwijaydavie@gmail.com\n` +
               `📞 **Phone / WhatsApp**: +255 620 641 695 / 0620641695\n` +
               `🔗 **LinkedIn**: https://www.linkedin.com/in/mwijay-davie/`;
    }},
    { pattern: /.*(linkedin|linkdin|profile|professional network).*/i, action: () => {
        return `Connect with **Mwijay Davie** on LinkedIn to see professional updates, systems built, and grow your network:\n\n` +
               `🔗 **LinkedIn Profile**: https://www.linkedin.com/in/mwijay-davie/`;
    }},
    { pattern: /.*(social media|instagram|ig|engage|rebrand|post|reel|follower|presence|curiosity|tiktok|twitter|thread).*/i, action: () => {
        return `Rebranding and mastering your Instagram & social media presence is the key to personal branding! Here is the strategy optimized for Mwijay Davie:\n\n` +
               `1. **Curiosity Loops (Did You Know? / Hakuna Micro-Fact?)**:\n` +
               `   Create high-value carousels and reels showing fascinating proof-of-research concepts. For instance: *"Did you know Google can cast a shadow on your database? Try this out..."* This raises curiosity and drives swipe-throughs/shares.\n` +
               `2. **Curated Tech Content with Oil (Business & Tech Integration)**:\n` +
               `   Avoid being a generic developer posting boring code screenshots. Position yourself as a "Business and Tech Leader" who posts about real-world value, automation workflows, and digital products.\n` +
               `3. **Automated Content Pipeline**:\n` +
               `   Save time! Use tools like Gemini to generate curiosity scripts and outline carousels, then automate high-quality Text-To-Speech (TTS) and video generation to keep a consistent daily rhythm.\n` +
               `4. **Reel Consistency**:\n` +
               `   Commit to posting short reels showing systems you've built (like this Music App!) with clear, excited calls to action. Showcase visual proofs!`;
    }},
    { pattern: /.*(remote job|make money|online job|student job|earn money|freelance|fiverr|upwork|tanzania|poverty).*/i, action: () => {
        return `Here are the best, legitimate remote job sites and methods that work globally and in Tanzania for students with computer skills (like web dev, automation, and AI tooling):\n\n` +
               `1. **Remote Job Portals**:\n` +
               `   • **Appen / Telus International**: Great for micro-tasks (AI training, search rating, translation tasks). High acceptance rate, paid via PayPal/Payoneer.\n` +
               `   • **Upwork & Freelancer**: Saturating but highly lucrative if you showcase proof of work. Focus on automation contracts, custom AI chatbots, and document processing using AI.\n` +
               `   • **Fiverr**: Position yourself uniquely in "AI-assisted document automation" or "No-code automation setup" instead of generic web design to avoid saturated bids.\n\n` +
               `2. **Student & Automation Hustles (2026 Strategy)**:\n` +
               `   • **AI Content Services**: Automate story-writing or book translations for clients, utilizing Gemini APIs to expedite the translation and validation.\n` +
               `   • **Lead Automation**: Reach out to local Tanzanian companies and offer a "Telegram/WhatsApp AI Customer Support bot" (using your Telegram chatbot package details). Show them a working demo!\n` +
               `   • **Contract & Organized Structures**: Always write down formal terms, clear payment milestones (e.g. 50% upfront, 30% after beta, 20% on deploy), and follow-up support agreements.`;
    }},
    
    // Offline Prompts Alignment
    { pattern: /^(play some music|play music|start music)$/, action: (context) => {
        if (context.appState.isPlaying) return "Music is already playing!";
        context.controls.togglePlay();
        return "Resuming playback.";
    }},
    { pattern: /^(play some radio|play radio|radio)$/, action: ({ controls }) => {
        controls.navigateToView({ viewName: 'Radio' });
        return "Opening Radio view. Let's find some stations!";
    }},
    { pattern: /^(enable|turn on) simple mode$/, action: ({ controls }) => {
        controls.setSimpleMode({ enabled: true });
        return "Simple Mode enabled.";
    }},
    { pattern: /^(disable|turn off) simple mode$/, action: ({ controls }) => {
        controls.setSimpleMode({ enabled: false });
        return "Simple Mode disabled. Switched back to Standard Mode.";
    }},
    { pattern: /^(show|show my) top songs$/, action: ({ controls }) => {
        controls.navigateToView({ viewName: 'Library' });
        return "Opening Library. Check out your Top Songs section!";
    }},
    { pattern: /^(show|show my) top artists$/, action: ({ controls }) => {
        controls.navigateToView({ viewName: 'Library' });
        return "Opening Library. Your Top Artists are shown inside your library page.";
    }},
    { pattern: /^how (do i|to) change (the )?theme\??$/, action: () => {
        return "To change the theme manually, go to Settings, then click on Appearance or select your favorite Theme Preset from the themes picker!";
    }},
    { pattern: /^how (do i|to) change (the )?font\??$/, action: () => {
        return "You can change fonts in settings! Under Appearance, you will find the Font Family scroller. Just tap any font to apply it instantly.";
    }},
    { pattern: /^(apply|set|switch to) (the )?(.+?) theme$/, action: ({ controls }, params) => {
        return controls.applyThemeByName({ themeName: params[2] });
    }},
    { pattern: /^set (?:a )?sleep timer for (\d+)\s*(?:mins?|minutes?)$/i, action: ({ controls }, params) => {
        const mins = parseInt(params[0]);
        controls.setSleepTimer({ mode: 'duration', value: mins });
        return `Sleep timer set for ${mins} minutes.`;
    }},

    // Fallback
    { pattern: /.*/, action: () => "I didn't catch that. Try specific commands like 'Play music', 'Set crossfade to 2', or ask me about 'Mwijay services' or 'Mwijay contacts'!" }
];

export const assistantKnowledge = {
    async processCommand(text: string, context: CommandContext): Promise<string> {
        const cleanCommand = text.toLowerCase().trim().replace(/[?.,!]/g, '');

        for (const { pattern, action } of commandPatterns) {
            const match = cleanCommand.match(pattern);
            if (match) {
                if (pattern.source === '.*' && commandPatterns.indexOf({pattern, action}) !== commandPatterns.length - 1) continue; 
                
                const params = match.slice(1);
                const result = await action(context, params);
                return result;
            }
        }
        return "I didn't quite get that.";
    }
};
