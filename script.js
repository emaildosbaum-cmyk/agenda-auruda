gsap.registerPlugin(ScrollTrigger);

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Doodles per game — cada um distinto, não é decoração genérica
const DOODLES = {
  "Blox Fruits": `
    <svg viewBox="0 0 130 130" fill="none">
      <path d="M65 120C65 90 50 78 65 55" stroke="#4a7c59" stroke-width="5" stroke-linecap="round"/>
      <circle cx="65" cy="42" r="26" fill="#f9a620"/>
      <path d="M65 16C68 16 74 20 74 27" stroke="#4a7c59" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="60" r="15" fill="#b7472a"/>
      <circle cx="90" cy="65" r="12" fill="#4a7c59"/>
    </svg>`,
  "Roblox": `
    <svg viewBox="0 0 130 130" fill="none">
      <rect x="30" y="30" width="34" height="34" rx="4" fill="#4a7c59"/>
      <rect x="68" y="30" width="34" height="34" rx="4" fill="#f9a620"/>
      <rect x="30" y="68" width="34" height="34" rx="4" fill="#b7472a"/>
      <rect x="68" y="68" width="34" height="34" rx="4" fill="#4a7c59" opacity="0.6"/>
    </svg>`,
  "Roube um Ovo": `
    <svg viewBox="0 0 130 130" fill="none">
      <ellipse cx="65" cy="95" rx="45" ry="14" fill="#4a7c59" opacity="0.2"/>
      <path d="M65 95C40 95 25 88 25 78C25 68 40 60 65 60C90 60 105 68 105 78C105 88 90 95 65 95Z" fill="#b7472a" opacity="0.35"/>
      <ellipse cx="65" cy="58" rx="22" ry="30" fill="#f9a620"/>
      <ellipse cx="58" cy="48" rx="6" ry="9" fill="#fff" opacity="0.5"/>
    </svg>`
};

function pillsFor(times){
  return times.map(t => `<span class="time-pill">${t}</span>`).join("");
}

async function loadAgenda(){
  const container = document.getElementById('daysContainer');
  const { data, error } = await db
    .from('lives')
    .select('*')
    .order('weekday_index', { ascending: true })
    .order('time', { ascending: true });

  if (error || !data || data.length === 0){
    container.classList.remove('loading');
    container.innerHTML = `<p class="loading-text">não consegui carregar a agenda agora — tenta recarregar a página.</p>`;
    return renderTrack();
  }

  // agrupa por dia
  const byDay = {};
  data.forEach(row => {
    const key = row.weekday_index;
    if (!byDay[key]) byDay[key] = { label: row.weekday_label, game: row.game, times: [] };
    byDay[key].times.push(row.time);
  });

  container.classList.remove('loading');
  container.innerHTML = '';

  Object.keys(byDay).sort((a,b)=>a-b).forEach(key => {
    const day = byDay[key];
    const card = document.createElement('article');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-illustration">${DOODLES[day.game] || DOODLES["Roblox"]}</div>
      <p class="day-label">${day.label}</p>
      <h3 class="day-game">${day.game}</h3>
      <div class="day-times">${pillsFor(day.times)}</div>
    `;
    container.appendChild(card);
  });

  renderTrack();
}

function renderTrack(){
  const track = document.getElementById('horizontalTrack');
  const progressFill = document.getElementById('progressFill');

  // espera o layout assentar antes de medir largura
  requestAnimationFrame(() => {
    ScrollTrigger.refresh();

    const mainTween = gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth),
      ease: "none",
      scrollTrigger: {
        trigger: track,
        start: "top top",
        end: () => "+=" + (track.scrollWidth - window.innerWidth),
        scrub: 0.6,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: self => { progressFill.style.width = (self.progress * 100) + "%"; }
      }
    });

    // entrada suave de cada card conforme ele aparece no scroll horizontal
    gsap.utils.toArray('.day-card').forEach(card => {
      gsap.fromTo(card, { opacity: 0.35, scale: 0.94 }, {
        opacity: 1, scale: 1,
        ease: "none",
        scrollTrigger: {
          containerAnimation: mainTween,
          trigger: card,
          start: "left 85%",
          end: "left 40%",
          scrub: true
        }
      });
    });

    // esconde a dica de scroll assim que o usuário começa a rolar
    ScrollTrigger.create({
      trigger: track,
      start: "top top-=10",
      onEnter: () => document.getElementById('scrollHint')?.classList.add('hidden'),
      onLeaveBack: () => document.getElementById('scrollHint')?.classList.remove('hidden')
    });
  });
}

loadAgenda();
