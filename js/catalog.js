    const PHOTO = 'assets/c-diphtheriae-micrograph.jpg';
    const PHOTO_SOURCE = 'https://commons.wikimedia.org/wiki/File:Corynebacterium_diphtheriae_Gram_stain.jpg';
    const searchItems = [
      {label:'Патология', detail:'Контрольные работы · РК 1 доступна', view:'pathology'},
      {label:'Микробиология', detail:'Дифтерия · морфология · диагностика', view:'micro'},
      {label:'Corynebacterium diphtheriae', detail:'Морфология, вирулентность и лабораторная диагностика', view:'micro'},
      {label:'Внутренние болезни', detail:'Материалы скоро появятся', view:'internal'}
    ];
    const state = {view:'catalog', rk:1};
    const main = document.getElementById('main-inner');
    const rail = document.getElementById('rail-inner');
    const siteSearch = document.getElementById('site-search');
    const searchResults = document.getElementById('search-results');
    const end = '<div class="page-end">Pathology Trainer · Учебные материалы</div>';
    const crumb = (subject) => `<div class="breadcrumb"><button type="button" data-view="catalog">Каталог</button><span>/</span>${subject}</div>`;
    const heading = (label, title, description) => `<header class="page-head"><div class="eyebrow">${label}</div><h1>${title}</h1><p>${description}</p></header>`;
    const toc = (items, noteTitle, note) => `<div class="rail-title">На этой странице</div>${items.map(x=>`<button class="rail-link" type="button" data-anchor="${x[0]}">${x[1]}</button>`).join('')}<div class="rail-rule"></div><div class="rail-note"><b>${noteTitle}</b>${note}</div>`;
    function catalog() {
      main.innerHTML = `
        <div class="breadcrumb">Каталог предметов</div>
        ${heading('Учебные материалы', 'Каталог предметов', 'Выберите дисциплину, затем нужную контрольную работу или тему. Материалы собраны так, чтобы каталог рос вместе с вашим курсом.')}
        <section class="feature" aria-label="Быстрый переход к патологии">
          <div><div class="eyebrow">Продолжить подготовку</div><h2>Патология · РК 1</h2><p>Отдельный банк внутри предмета. В дальнейшем здесь появятся РК 2, РК 3 и следующие работы.</p><div class="feature-meta">Контрольная работа · отдельная статистика</div></div>
          <div class="feature-action"><a class="btn-primary" href="rk1.html">Перейти к тестам РК 1</a></div>
        </section>
        <div class="section-heading" id="subjects"><div><div class="eyebrow">Дисциплины</div><h2>Предметы</h2></div><small>Каталог можно расширять новыми предметами</small></div>
        <div class="subject-grid">
          <button class="subject-card" type="button" data-view="pathology"><span class="card-top"></span><span class="card-body"><span class="card-index">01 / ТРЕНАЖЁР</span><h3>Патология</h3><p>Контрольные работы и повторение тем.</p><span class="card-footer"><span>Посмотреть РК</span><small>РК 1 доступна</small></span></span></button>
          <button class="subject-card micro" type="button" data-view="micro"><span class="card-top"></span><span class="card-body"><span class="card-index">02 / В РАБОТЕ</span><h3>Микробиология</h3><p>Corynebacterium diphtheriae: морфология, факторы вирулентности и диагностика.</p><span class="card-footer"><span>Открыть раздел</span><small>1 тема</small></span></span></button>
          <button class="subject-card internal" type="button" data-view="internal"><span class="card-top"></span><span class="card-body"><span class="card-index">03 / СКОРО</span><h3>Внутренние болезни</h3><p>Учебные материалы по предмету готовятся.</p><span class="card-footer"><span>Открыть раздел</span><small>Скоро</small></span></span></button>
        </div>
        <div class="catalog-note"><div><b>Новые РК</b><p>Каждая работа остаётся внутри своего предмета. Это позволяет расширять банк, сохраняя понятную навигацию.</p></div><div><b>Новые дисциплины</b><p>Предметы появляются здесь отдельными разделами; им не нужно повторять одинаковую структуру материалов.</p></div></div>${end}`;
      rail.innerHTML = toc([['subjects','Предметы']], 'Как устроен каталог', 'Патология организована по РК. Микробиология — по возбудителям и методам. Внутренние болезни — по темам и препаратам.');
    }
    function pathology() {
      const isReady = state.rk === 1;
      main.innerHTML = `${crumb('Патология')}
        ${heading('Патология / Контрольные работы', 'Патология', 'Для каждой РК предусмотрен отдельный банк и собственный путь подготовки. Выберите работу ниже.')}
        ${teamStatus('Структура контрольных работ уже видна. Тесты РК 1 уже доступны. Команда готовит дополнительные материалы и следующие РК.')}
        <div class="tabs" role="tablist" aria-label="Контрольные работы">
          ${[1,2,3].map(n=>`<button class="tab" type="button" role="tab" aria-selected="${state.rk===n}" data-rk="${n}">РК ${n}${n===1?' · доступна':''}</button>`).join('')}
        </div>
        <section class="bank-panel" id="bank">
          <div class="eyebrow">Контрольная работа ${state.rk}</div>
          <h2>РК ${state.rk}${isReady?' · банк вопросов':''}</h2>
          <p>${isReady?'Структура тренажёра помогает сначала пройти вопросы, затем разобрать ошибки и вернуться к сложным темам.':'Так будет выглядеть следующая контрольная работа, когда её материалы будут добавлены в каталог.'}</p>
          ${isReady?`<div class="mode-list"><div class="mode-row"><b>Тренировка</b><span>Последовательное прохождение вопросов с разбором ответов.</span></div><div class="mode-row"><b>Экзамен</b><span>Отдельный режим для самопроверки перед коллоквиумом.</span></div><div class="mode-row"><b>Ошибки</b><span>Возврат к вопросам, в которых вы затруднились.</span></div></div><a class="btn-primary trainer-entry" href="rk1.html">Открыть тесты РК 1 →</a>`:`<div class="source-strip"><b>Место для будущего банка</b><span>Нумерация и содержание появятся после загрузки исходных вопросов.</span></div>`}
        </section>
        <div class="next-bank"><b>Как каталог будет расти</b>Новые РК добавляются как соседние вкладки. Предмет и привычная структура страницы сохраняются.</div>${end}`;
      rail.innerHTML = toc([['bank','Выбранная РК']], 'Масштабирование', 'Когда добавятся РК 2 и РК 3, студент увидит их рядом с РК 1, без нового меню и без смешивания банков.');
    }
    function teamStatus(message) {
      return `<section class="coming-card compact" aria-label="Команда готовит учебные материалы">
        <div class="coming-copy"><div class="eyebrow">РАЗДЕЛ В РАБОТЕ</div><h2>Новые материалы появятся чуть позже</h2><p>${message}</p><div class="coming-status">Команда уже работает</div></div>
        <div class="coming-crew" role="img" aria-label="Трое студентов: длинноволосый студент за ноутбуком, студент в очках с комиксом и девушка с учебниками"><img src="assets/coming-soon-coder-cartoon.png" alt="" loading="eager"><img src="assets/coming-soon-comic-cartoon.png" alt="" loading="eager"><img src="assets/coming-soon-textbooks-cartoon.png" alt="" loading="eager"></div>
      </section>`;
    }
    function comingSoon(subject) {
      return `<section class="coming-card" aria-label="Раздел готовится">
        <div class="coming-copy"><div class="eyebrow">РАЗДЕЛ ГОТОВИТСЯ</div><h2>Материалы скоро появятся</h2><p>Мы готовим учебные материалы по ${subject}. Они появятся здесь, когда будут готовы.</p><div class="coming-status">Команда уже за работой</div></div>
        <div class="coming-crew" role="img" aria-label="Трое студентов: длинноволосый студент за ноутбуком, студент в очках с комиксом и девушка с учебниками"><img src="assets/coming-soon-coder-cartoon.png" alt="" loading="eager"><img src="assets/coming-soon-comic-cartoon.png" alt="" loading="eager"><img src="assets/coming-soon-textbooks-cartoon.png" alt="" loading="eager"></div>
      </section>`;
    }
    function micro() {
      main.innerHTML = `${crumb('Микробиология')}
        ${heading('Микробиология · Бактериология', 'Corynebacterium diphtheriae', 'Дифтерия: строение, факторы патогенности и лабораторная диагностика.')}
        ${teamStatus('Структура и основные тезисы собраны по материалам ТЗ. Подробные объяснения методов и вопросы для самопроверки команда добавит чуть позже.')}
        <figure class="photo-card" id="image">
          <img src="${PHOTO}" alt="Микрофотография Corynebacterium diphtheriae после окраски метиленовым синим" loading="lazy">
          <figcaption class="photo-info"><div class="eyebrow">РЕАЛЬНАЯ МИКРОФОТОГРАФИЯ · CDC / PHIL #7323</div><h2>Возбудитель в препарате</h2><p>Микрофотография Corynebacterium diphtheriae, окрашенной метиленовым синим.</p><a href="${PHOTO_SOURCE}" target="_blank" rel="noopener noreferrer">Открыть источник и атрибуцию ↗</a></figcaption>
        </figure>
        <div class="fact-grid"><div class="fact"><strong>Грам+</strong><span>Грамположительная полиморфная палочка</span></div><div class="fact"><strong>0,3–0,8 × 1,5–8,0</strong><span>Размеры, мкм · по ТЗ</span></div><div class="fact"><strong>Неподвижна</strong><span>Клетки могут располагаться под углом друг к другу</span></div></div>
        <section class="article-section" id="morphology"><div class="eyebrow">01 / СТРОЕНИЕ</div><h2>Морфологические признаки</h2><div class="split-cards"><div class="content-card"><div class="eyebrow">ФОРМА И ОКРАСКА</div><h3>Полиморфные палочки</h3><p>В ТЗ указаны грамположительная окраска, неподвижность и размеры <b>0,3–0,8 × 1,5–8,0 мкм</b>.</p></div><div class="content-card"><div class="eyebrow">РАСПОЛОЖЕНИЕ В МАЗКЕ</div><h3>V- и L-образные группы</h3><p>Клетки могут располагаться попарно под углом друг к другу.</p></div></div></section>
        <section class="article-section" id="virulence"><div class="eyebrow">02 / ПАТОГЕННОСТЬ</div><h2>Факторы вирулентности</h2><div class="factor-list"><div class="factor-row featured"><div class="row-no">01</div><div><h3>Дифтерийный экзотоксин</h3><p>В ТЗ токсигенность связана с геном <i>tox</i>; токсин нарушает синтез белка в клетках.</p></div></div><div class="factor-row"><div class="row-no">02</div><div><h3>Адгезия и инвазия</h3><p>В исходном материале перечислены пили, поверхностные белки и ферменты, участвующие в инвазии.</p></div></div><div class="factor-row"><div class="row-no">03</div><div><h3>Защита и персистенция</h3><p>Среди факторов в ТЗ названы капсула, кориномиколовые кислоты, каталаза, биоплёнки и сохранение возбудителя в макрофагах.</p></div></div></div></section>
        <section class="article-section" id="diagnostics"><div class="eyebrow">03 / ЛАБОРАТОРНАЯ ДИАГНОСТИКА</div><h2>Как подтверждают диагноз</h2><div class="method-list"><div class="method-row"><div class="row-no">01</div><div><h3>Культуральный метод</h3><p>В ТЗ выделен как основной; токсигенность культуры требует отдельного подтверждения.</p><details><summary>Принцип метода</summary><p>Подробное объяснение этапов исследования команда подготовит отдельно.</p></details></div><div class="method-type">Основной</div></div><div class="method-row"><div class="row-no">02</div><div><h3>ПЦР</h3><p>В исходном документе указано выявление гена <i>tox</i> в ДНК выделенной культуры.</p><details><summary>Принцип метода</summary><p>Здесь появится разбор мишени, материала и интерпретации результата.</p></details></div><div class="method-type">Вспомогательный</div></div><div class="method-row"><div class="row-no">03</div><div><h3>Серологические методы</h3><p>В ТЗ упомянуты РПГА и ИФА для оценки противодифтерийного иммунитета.</p><details><summary>Принцип метода</summary><p>Здесь появится разбор принципов методов и границ интерпретации.</p></details></div><div class="method-type">По ТЗ</div></div></div></section>${end}`;
      rail.innerHTML = toc([['image','Микрофотография'],['morphology','Морфологические признаки'],['virulence','Факторы вирулентности'],['diagnostics','Диагностика']], 'Материал по ТЗ', 'На странице показана предварительная структура раздела. Подробные объяснения и вопросы добавит команда.');
    }
    function internal() {
      main.innerHTML = `${crumb('Внутренние болезни')}${heading('Внутренние болезни', 'Внутренние болезни', 'Будущий раздел для тем, клинических случаев и материалов к экзамену.')} ${comingSoon('внутренним болезням')}${end}`;
      rail.innerHTML = toc([], 'Новые материалы', 'Сюда можно будет добавлять темы и блоки по мере подготовки.');
    }
    function escapeHTML(s) { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function render() {
      if(state.view==='pathology') pathology(); else if(state.view==='micro') micro(); else if(state.view==='internal') internal(); else catalog();
      document.querySelectorAll('.side-item').forEach(b=>{
        const active=b.dataset.view===state.view;
        if(active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
      });
    }
    function navigate(view) {
      state.view=view;
      location.hash=view;
      render();
      window.scrollTo({top:0,behavior:'smooth'});
      siteSearch.value=''; searchResults.hidden=true;
    }
    function updateSearch() {
      const q=siteSearch.value.trim().toLocaleLowerCase('ru');
      if(!q){searchResults.hidden=true;return;}
      const matches=searchItems.filter(x=>(x.label+' '+x.detail).toLocaleLowerCase('ru').includes(q));
      searchResults.innerHTML=matches.length?matches.map(x=>`<button class="search-result" type="button" data-view="${x.view}"><strong>${x.label}</strong><small>${x.detail}</small></button>`).join(''):'<div class="search-empty">Ничего не найдено</div>';
      searchResults.hidden=false;
    }
    document.addEventListener('click',e=>{
      const view=e.target.closest('[data-view]');
      if(view){navigate(view.dataset.view);return;}
      const rk=e.target.closest('[data-rk]');
      if(rk){state.rk=Number(rk.dataset.rk);render();document.getElementById('bank')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      const anchor=e.target.closest('[data-anchor]');
      if(anchor){document.getElementById(anchor.dataset.anchor)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      if(!e.target.closest('.search-wrap')) searchResults.hidden=true;
    });
    document.addEventListener('input',e=>{
      if(e.target===siteSearch) updateSearch();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){searchResults.hidden=true;siteSearch.blur();}
      if(e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();siteSearch.focus();}
    });
    const initial=location.hash.slice(1);
    if(['catalog','pathology','micro','internal'].includes(initial)) state.view=initial;
    window.addEventListener('hashchange',()=>{
      const hash=location.hash.slice(1)||'catalog';
      if(!['catalog','pathology','micro','internal'].includes(hash)) return;
      if(state.view!==hash){state.view=hash;render();window.scrollTo(0,0);}
    });
    render();
