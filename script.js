gsap.registerPlugin(ScrollTrigger);

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Badges temáticas geradas para cada jogo
const BADGES = {
  "Blox Fruits": "images/blox-fruits.jpg",
  "Roblox": "images/roblox.jpg",
  "Roube um Ovo": "images/roube-ovo.jpg"
};

const WEEKDAY_NAMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo"
];

function pillsFor(times) {
  return times.map(t => `<span class="time-pill">${t}</span>`).join("");
}

async function loadAgenda() {
  const container = document.getElementById('daysContainer');
  const { data, error } = await db
    .from('lives')
    .select('*')
    .order('weekday_index', { ascending: true })
    .order('time', { ascending: true });

  if (error || !data || data.length === 0) {
    container.classList.remove('loading');
    container.innerHTML = `<p class="loading-text">não consegui carregar a agenda agora — tenta recarregar a página.</p>`;
    return renderTrack();
  }

  // Agrupa os horários e jogos por weekday_index (0 = Segunda ... 6 = Domingo)
  const byWeekdayIndex = {};
  data.forEach(row => {
    const key = row.weekday_index;
    if (!byWeekdayIndex[key]) {
      byWeekdayIndex[key] = { label: row.weekday_label, game: row.game, times: [] };
    }
    byWeekdayIndex[key].times.push(row.time);
  });

  // Calcula Hoje e os próximos 6 dias dinamicamente no fuso horário de São Paulo
  const now = new Date();
  const spDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  const upcomingDays = [];
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(spDate);
    d.setDate(spDate.getDate() + offset);

    const jsDay = d.getDay(); // 0 = Domingo, 1 = Segunda ... 6 = Sábado
    const baseWeekdayIndex = (jsDay + 6) % 7; // converte para 0 = Segunda ... 6 = Domingo

    const daySchedule = byWeekdayIndex[baseWeekdayIndex] || {
      label: WEEKDAY_NAMES[baseWeekdayIndex],
      game: "Descanso / Especial",
      times: ["A Definir"]
    };

    const dateFormatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const isToday = offset === 0;

    upcomingDays.push({
      dateFormatted,
      weekdayLabel: WEEKDAY_NAMES[baseWeekdayIndex],
      isToday,
      game: daySchedule.game,
      times: daySchedule.times
    });
  }

  container.classList.remove('loading');
  container.innerHTML = '';

  upcomingDays.forEach(day => {
    const card = document.createElement('article');
    card.className = `day-card ${day.isToday ? 'is-today' : ''}`;

    const badgeImg = BADGES[day.game] || BADGES["Roblox"];
    const tagToday = day.isToday ? `<span class="badge-today">🔥 HOJE</span>` : '';

    card.innerHTML = `
      <div class="day-illustration">
        <img src="${badgeImg}" alt="${day.game}" class="game-badge-img" loading="lazy" />
      </div>
      <div class="day-header-info">
        <p class="day-label">${day.weekdayLabel}, ${day.dateFormatted} ${tagToday}</p>
      </div>
      <h3 class="day-game">${day.game}</h3>
      <div class="day-times">${pillsFor(day.times)}</div>
    `;
    container.appendChild(card);
  });

  renderTrack();
}

function renderTrack() {
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
