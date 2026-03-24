(function(){
  'use strict';
  var isMobile = window.matchMedia('(max-width:768px)').matches;

  /* Cursor */
  var cur = document.getElementById('customCursor');
  var cx=0,cy=0,px=0,py=0;
  if(!isMobile && cur){
    document.addEventListener('mousemove',function(e){cx=e.clientX;cy=e.clientY;if(!cur.classList.contains('visible'))cur.classList.add('visible');});
    document.addEventListener('mouseleave',function(){cur.classList.remove('visible');});
    (function loop(){px+=(cx-px)*.15;py+=(cy-py)*.15;cur.style.left=px+'px';cur.style.top=py+'px';requestAnimationFrame(loop);})();
    document.querySelectorAll('a,button,input,textarea,select').forEach(function(el){
      el.addEventListener('mouseenter',function(){cur.classList.add('hover');});
      el.addEventListener('mouseleave',function(){cur.classList.remove('hover');});
    });
  }

  /* Star parallax */
  var stars=document.getElementById('bgStars');
  if(!isMobile&&stars){document.addEventListener('mousemove',function(e){var x=(e.clientX/window.innerWidth-.5)*16;var y=(e.clientY/window.innerHeight-.5)*16;stars.style.transform='translate('+x+'px,'+y+'px)';});}

  /* Nav scroll */
  var nav=document.getElementById('mainNav');
  if(nav){window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>50);},{passive:true});}

  /* Mobile nav */
  var tog=document.getElementById('navToggle'),links=document.getElementById('navLinks');
  if(tog){tog.addEventListener('click',function(){links.classList.toggle('open');});links.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){links.classList.remove('open');});});}

  /* Nav: News active on /news, news.html, news/index.html */
  (function(){
    var navLinks=document.getElementById('navLinks');
    if(!navLinks)return;
    var path=(window.location.pathname||'').replace(/\\/g,'/');
    var onNews=/news\.html$/i.test(path)||/\/news\/?$/i.test(path)||/\/news\/index\.html$/i.test(path);
    if(!onNews)return;
    navLinks.querySelectorAll('a').forEach(function(a){a.classList.remove('nav-link-active');});
    var newsLink=null;
    navLinks.querySelectorAll('a').forEach(function(a){
      if((a.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()==='news')newsLink=a;
    });
    if(newsLink)newsLink.classList.add('nav-link-active');
  })();

  /* SERVICES → #services: smooth scroll on landing; other pages follow link to /#services */
  var servicesA=document.querySelector('a[href="/#services"]');
  if(servicesA){servicesA.addEventListener('click',function(e){
    var p=window.location.pathname||'';
    var onLanding=(p==='/'||/\/index\.html$/i.test(p));
    if(!onLanding)return;
    e.preventDefault();
    var sec=document.getElementById('services');
    if(sec)sec.scrollIntoView({behavior:'smooth'});
  });}

  /* Scroll reveal */
  var obs=new IntersectionObserver(function(ents){ents.forEach(function(en){if(en.isIntersecting){en.target.classList.add('visible');obs.unobserve(en.target);}});},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});

  /* Lazy video play */
  var videoObs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var video = entry.target;
      if(entry.isIntersecting){
        video.play().catch(function(){});
      } else {
        video.pause();
      }
    });
  },{threshold:0.25});
  document.querySelectorAll('video[data-lazy]').forEach(function(v){
    videoObs.observe(v);
  });

  /* Case card click → video overlay */
  document.querySelectorAll('.case-card[data-video-src], .project-card[data-video-src]').forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      var src = this.dataset.videoSrc;
      if (!src) return;
      var ov = document.createElement('div');
      ov.className = 'case-video-overlay';
      var safeSrc = encodeURI(src);
      ov.innerHTML = '<video autoplay controls playsinline><source src="' + safeSrc + '" type="video/mp4"></video><button class="overlay-close">ESC</button>';
      ov.addEventListener('click', function(ev) {
        if (ev.target === ov || ev.target.classList.contains('overlay-close')) {
          ov.querySelector('video').pause();
          ov.remove();
        }
      });
      document.body.appendChild(ov);
    });
  });

  /* Count-up (easeOutExpo) */
  var cobs=new IntersectionObserver(function(ents){ents.forEach(function(en){
    if(!en.isIntersecting)return;
    var el=en.target;
    var target=parseInt(el.dataset.target,10);
    var suffix=el.dataset.suffix||'';
    var duration=1800;
    var start=performance.now();
    function update(now){
      var elapsed=now-start;
      var progress=Math.min(elapsed/duration,1);
      var ease=progress===1?1:1-Math.pow(2,-10*progress);
      el.textContent=Math.round(target*ease)+suffix;
      if(progress<1)requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
    cobs.unobserve(el);
  });},{threshold:.5});
  document.querySelectorAll('[data-target]').forEach(function(el){cobs.observe(el);});

  /* CTA Form */
  var form=document.getElementById('ctaForm'),email=document.getElementById('ctaEmail'),err=document.getElementById('ctaErr'),ok=document.getElementById('ctaOk');
  if(form)form.addEventListener('submit',function(e){e.preventDefault();var v=email.value.trim();err.classList.remove('show');ok.classList.remove('show');form.classList.remove('error');
    if(!v||v.indexOf('@')===-1||v.indexOf('.')===-1){form.classList.add('error');err.classList.add('show');return;}
    ok.classList.add('show');email.value='';});

  /* Typewriter */
  (function(){
    var line1El = document.getElementById('typedLine1');
    var line2El = document.getElementById('typedLine2');
    var cursorEl = document.getElementById('typeCursor');
    if (!line1El) return;

    var lines = [
      { el: line1El, segments: [
        { text: 'No More ', cls: 'dim' },
        { text: 'Impossible,', cls: '' }
      ]},
      { el: line2El, segments: [
        { text: 'Only Possible.', cls: 'lime' }
      ]}
    ];

    var charDelay = 60;
    var lineDelay = 350;
    var startDelay = 800;

    function placeCursor(el) {
      el.appendChild(cursorEl);
    }

    function typeLine(lineObj, cb) {
      var el = lineObj.el;
      var segs = lineObj.segments;
      var si = 0, ci = 0, span = null;

      el.textContent = '';

      function tick() {
        if (si >= segs.length) { placeCursor(el); if (cb) cb(); return; }
        var s = segs[si];
        if (!span) {
          span = document.createElement('span');
          if (s.cls) span.className = s.cls;
          el.appendChild(span);
        }
        if (ci < s.text.length) {
          span.textContent += s.text[ci];
          ci++;
          placeCursor(el);
          setTimeout(tick, charDelay + Math.random() * 35);
        } else {
          si++; ci = 0; span = null;
          tick();
        }
      }
      tick();
    }

    function runLines(idx) {
      if (idx >= lines.length) return;
      typeLine(lines[idx], function() {
        setTimeout(function() { runLines(idx + 1); }, lineDelay);
      });
    }

    placeCursor(line1El);
    setTimeout(function() { runLines(0); }, startDelay);
  })();

  /* Smooth scroll (for anchor links only) */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var id=this.getAttribute('href');if(id==='#')return;var t=document.querySelector(id);if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}});});

  /* Smooth scroll for hash on page load (from other pages) */
  if(window.location.hash){
    var target = document.querySelector(window.location.hash);
    if(target){
      setTimeout(function(){
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }, 300);
    }
  }

  /* Video overlay */
  document.querySelectorAll('[data-video-id]').forEach(function(card){
    card.addEventListener('click', function(){
      var vid = this.dataset.videoId;
      if(!vid) return;
      var ov = document.createElement('div');
      ov.className = 'video-overlay';
      ov.innerHTML = '<iframe src="https://www.youtube.com/embed/'+vid+'?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
      ov.addEventListener('click', function(e){ if(e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    });
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      var ov = document.querySelector('.video-overlay') || document.querySelector('.case-video-overlay');
      if(ov) {
        var vid = ov.querySelector('video');
        if(vid) vid.pause();
        ov.remove();
      }
    }
  });

  /* Project video click-to-play */
  var videoThumb = document.querySelector('.project-video-thumb');
  if(videoThumb){
    videoThumb.addEventListener('click', function(){
      var wrap = this.parentElement;
      var videoId = this.dataset.videoId;
      if(videoId){
        this.style.display = 'none';
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube.com/embed/'+videoId+'?autoplay=1&rel=0';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
      }
    });
  }

  /* Contact page: 이메일 → Vercel /api/submit-email → Supabase (서버에서 service_role로 저장) */
  var contactForm = document.getElementById('contactForm');
  var emailInput = document.getElementById('emailInput');
  if(contactForm && emailInput){
    var btn = contactForm.querySelector('.email-submit');
    var successState = document.getElementById('successState');
    var sentEmail = document.getElementById('sentEmail');

    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = emailInput.value.trim();
      if(!email) return;

      var btnHtml = btn ? btn.innerHTML : '';
      if(btn){
        btn.classList.add('loading');
        btn.textContent = '';
      }

      fetch('/api/submit-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ email: email })
      }).then(function(res){
        if(btn){
          btn.classList.remove('loading');
          btn.innerHTML = btnHtml;
        }
        if(res.ok){
          contactForm.style.display = 'none';
          if(sentEmail) sentEmail.textContent = email;
          if(successState) successState.style.display = 'block';
        } else {
          res.text().then(function(text){
            var msg = text;
            try {
              var data = JSON.parse(text);
              msg = (data && (data.detail || data.error || data.message)) ? String(data.detail || data.error || data.message) : text;
            } catch (ignore) {}
            window.alert('전송 실패 HTTP ' + res.status + '\n\n' + (msg || text).slice(0, 400));
          }).catch(function(){
            window.alert('전송에 실패했습니다. (HTTP ' + res.status + ')');
          });
        }
      }).catch(function(){
        if(btn){
          btn.classList.remove('loading');
          btn.innerHTML = btnHtml;
        }
        emailInput.style.borderColor = 'rgba(255,80,80,0.5)';
        window.alert('네트워크 오류가 발생했습니다.');
      });
    });

    emailInput.addEventListener('input', function(){
      emailInput.style.borderColor = '';
    });
  }
})();
