'use client';

import { useState, useEffect, useRef } from 'react';
import { showToast } from '../lib/toast';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0); // Start at 0% for animation
  const [targetProgress, setTargetProgress] = useState(0); // Start from 0, will be updated from API
  const [count, setCount] = useState(0); // Start from 0, will be updated from API
  const [goal, setGoal] = useState(5000); // Goal for progress calculation
  const [progressVisible, setProgressVisible] = useState(false); // Start hidden until scroll reveal
  const [animationStarted, setAnimationStarted] = useState(false); // Track if animation has started
  const [isMobile, setIsMobile] = useState(false); // Track mobile state for title delay
  
  // PRODUCTION DEBUG: Track environment and hydration
  useEffect(() => {
    console.log('🌍 ENVIRONMENT DEBUG:');
    console.log('  - Node ENV:', process.env.NODE_ENV);
    console.log('  - Is Browser:', typeof window !== 'undefined');
    console.log('  - User Agent:', navigator.userAgent);
    console.log('  - Page loaded at:', new Date().toISOString());
    console.log('  - Document ready state:', document.readyState);
    console.log('  - Page visibility:', document.visibilityState);
    
    // Track hydration status
    if (document.readyState === 'loading') {
      console.log('  - ⚠️ DOM still loading during React mount!');
    } else {
      console.log('  - ✅ DOM fully loaded before React mount');
    }
  }, []);
  
  // Mobile detection and title delay setup
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      console.log(`🔍 DEVICE CHECK: ${mobile ? 'MOBILE' : 'DESKTOP'} (width: ${window.innerWidth}px)`);
      
      const titleElement = document.querySelector('.mobile-scroll-reveal');
      if (titleElement) {
        if (mobile) {
          titleElement.setAttribute('data-delay', '300');
          console.log('📱 MOBILE TITLE: 300ms delay set');
        } else {
          titleElement.setAttribute('data-delay', '0');
          console.log('🖥️ DESKTOP TITLE: 0ms delay set');
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch initial count from database
  useEffect(() => {
    async function fetchInitialData() {
      try {
        console.log('📅 Fetching real signup data from database...');
        const response = await fetch('/api/send', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        const data = await response.json();
        
        if (typeof data.count === 'number' && typeof data.goal === 'number') {
          console.log(`📈 Real signup data: ${data.count}/${data.goal} (${data.percentage?.toFixed(1)}%)`);
          
          // Update all values from real API data
          setGoal(data.goal);
          setCount(data.count);
          
          const calculatedProgress = data.percentage || (data.count / data.goal) * 100;
          
          console.log(`🎯 Using real API data: ${data.count}/${data.goal} (${calculatedProgress.toFixed(1)}%)`);
          
          // Only update targetProgress if animation hasn't started yet
          if (!animationStarted) {
            setTargetProgress(calculatedProgress);
            console.log(`✅ Real progress applied: ${calculatedProgress.toFixed(1)}%`);
          } else {
            console.log(`🚫 Progress update blocked - animation already started`);
          }
        } else {
          console.warn('Invalid response format:', data);
          console.log('⚠️ Invalid data - keeping existing count values');
        }
      } catch (error) {
        console.warn('Failed to fetch initial data:', error);
        // Keep test values as fallback
        console.log('📅 Using fallback test values: progress=80% (4000/5000)');
        setCount(4000);
        setTargetProgress(80);
      }
    }
    fetchInitialData();
  }, [animationStarted]);

  // Enhanced sequential scroll-based reveal system supporting data-sequence
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    // Sort elements by data-sequence (default 0)
    const sortedElements = elements.slice().sort((a, b) => {
      const seqA = parseInt(a.getAttribute('data-sequence') || '0', 10);
      const seqB = parseInt(b.getAttribute('data-sequence') || '0', 10);
      return seqA - seqB;
    });
    const observer = new IntersectionObserver(
      (entries, obs) => {
        // Collect all entries that are intersecting, and sort by data-sequence
        const revealed: { el: HTMLElement; sequence: number; baseDelay: number }[] = [];
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const sequence = parseInt(el.getAttribute('data-sequence') || '0', 10);
            const baseDelay = parseInt(el.getAttribute('data-delay') || '0', 10);
            revealed.push({ el, sequence, baseDelay });
            obs.unobserve(el);
          }
        });
        // Sort by sequence
        revealed.sort((a, b) => a.sequence - b.sequence);
        // Stagger by sequence * 300ms, add baseDelay
        revealed.forEach(({ el, sequence, baseDelay }) => {
          const finalDelay = sequence === 1
            ? baseDelay // Logo shows immediately
            : sequence > 0
              ? sequence * 300 + baseDelay
              : baseDelay;
          setTimeout(() => {
            el.classList.remove('hidden');
            el.classList.add('revealed');
            if (el.id === 'progress-section') {
              setProgressVisible(true);
            }
          }, finalDelay);
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -10% 0px'
      }
    );
    sortedElements.forEach(el => {
      el.classList.remove('revealed');
      el.classList.add('hidden');
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Progress bar fill-up animation with optimized updates
  useEffect(() => {
    console.log('\\n🎯 PROGRESS BAR ANIMATION TRIGGER:');
    console.log('  - progressVisible:', progressVisible);
    console.log('  - targetProgress:', targetProgress + '%');
    console.log('  - current progress:', progress + '%');
    console.log('  - animationStarted:', animationStarted);
    
    if (!progressVisible) {
      console.log('  ❌ Animation blocked: progress not visible yet');
      return;
    }
    
    if (targetProgress <= 0) {
      console.log('  ❌ Animation blocked: target progress is 0% or negative');
      return;
    }
    
    if (animationStarted) {
      console.log('  ❌ Animation blocked: animation already started/completed');
      return;
    }
    
    console.log(`\n🎬 STARTING PROGRESS ANIMATION: ${progress}% → ${targetProgress}%`);
    
    // Mark that animation has started to prevent database interference
    setAnimationStarted(true);
    
    const duration = targetProgress > progress ? 1500 : 3500; // Faster for incremental updates, slower for initial load
    const startTime = performance.now();
    const startProgress = progress; // Start from current progress instead of 0
    let animationId: number;
    let frameCount = 0;
    
    console.log(`🔄 Animating from ${startProgress.toFixed(1)}% to ${targetProgress.toFixed(1)}%`);
    
    // Don't reset to 0 - animate from current progress
    
    // Very smooth easing function - gentler than quartic
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Update only every 6th frame to significantly reduce re-renders (10fps updates)
      if (frameCount % 6 === 0 || progressRatio >= 1) {
        // Apply very smooth easing to the progress
        const easedProgress = easeOutQuint(progressRatio);
        // Animate from startProgress to targetProgress instead of 0 to targetProgress
        const currentPercentage = startProgress + easedProgress * (targetProgress - startProgress);
        
        setProgress(currentPercentage);
        
        // Log progress occasionally
        if (frameCount % 60 === 0) {
          console.log(`📈 Animation: ${currentPercentage.toFixed(1)}% (${(progressRatio * 100).toFixed(1)}% complete)`);
        }
      }
      
      frameCount++;
      
      if (progressRatio < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        console.log(`✅ PROGRESS ANIMATION COMPLETE: ${targetProgress}% reached`);
        console.log(`   Total frames: ${frameCount}, Duration: ${elapsed.toFixed(0)}ms`);
      }
    };
    
    // Start animation after a short delay to ensure the progress section is visible
    console.log('⏰ Starting animation in 200ms...');
    const timeout = setTimeout(() => {
      console.log('🚀 LAUNCHING PROGRESS ANIMATION!');
      animationId = requestAnimationFrame(animate);
    }, 200);
    
    return () => {
      console.log('🛑 Progress animation cleanup called');
      clearTimeout(timeout);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [targetProgress, progressVisible]);

  // Progress bar visibility - removed separate observer since we handle this in the main scroll system


  // Scroll to top on every page load/reload (without blocking scroll)
  useEffect(() => {
    // Always scroll to top on page load, but do it safely
    const timeout = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      console.log('📍 Page loaded - scrolled to top');
    }, 50); // Reduced delay for faster response
    
    return () => clearTimeout(timeout);
  }, []);

  // Initialize particles (exactly like original)
  useEffect(() => {
    let animationIds = [];

    const initParticles = () => {
      // Background particles
      const backgroundCanvas = document.getElementById('particles-background') as HTMLCanvasElement;
      if (backgroundCanvas) {
        const ctxBg = backgroundCanvas.getContext('2d')!;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        backgroundCanvas.width = Math.floor(window.innerWidth * dpr);
        backgroundCanvas.height = Math.floor(window.innerHeight * dpr);
        ctxBg.setTransform(dpr, 0, 0, dpr, 0, 0);

        const bgParticles = [];
        for (let i = 0; i < 120; i++) {
          bgParticles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 3 + 1,
            dx: (Math.random() - 0.5) * 0.2,
            dy: (Math.random() - 0.5) * 0.2,
          });
        }

        function animateBgParticles() {
          ctxBg.clearRect(0, 0, window.innerWidth, window.innerHeight);
          bgParticles.forEach((p) => {
            ctxBg.beginPath();
            ctxBg.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctxBg.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctxBg.shadowColor = '#fff';
            ctxBg.shadowBlur = 4;
            ctxBg.fill();

            p.x += p.dx;
            p.y += p.dy;

            if (p.x <= 0 || p.x >= window.innerWidth) p.dx *= -1;
            if (p.y <= 0 || p.y >= window.innerHeight) p.dy *= -1;
          });
          const id = requestAnimationFrame(animateBgParticles);
          animationIds.push(id);
        }
        animateBgParticles();
      }

      // Interactive particles
      const canvas = document.getElementById('particles') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const particlesArray = [];
        let mouse = { x: null, y: null };
        let mouseSuppressed = false;
        let lastMouseTs = performance.now();
        let releaseActive = false;
        let releaseStart = 0;

        function getComputedParticleColor() {
          return getComputedStyle(document.documentElement)
            .getPropertyValue('--particle-color').trim() || '#FFFFFF';
        }

        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

        function triggerRelease() {
          const now = performance.now();
          if (releaseActive) return;
          releaseActive = true;
          releaseStart = now;

          const maxR = 200;
          for (const p of particlesArray) {
            if (mouse.x == null || mouse.y == null) break;
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < maxR) {
              const nx = dx / dist;
              const ny = dy / dist;
              const tangential = 0.3;
              p.vx += nx * 0.6 - ny * tangential * (Math.random() * 0.6);
              p.vy += ny * 0.6 + nx * tangential * (Math.random() * 0.6);
            }
          }
        }

        window.addEventListener('mousemove', (e) => {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
          lastMouseTs = performance.now();
          mouseSuppressed = false;
          if (releaseActive) releaseActive = false;
        }, { passive: true });

        window.addEventListener('blur', () => triggerRelease());
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') triggerRelease();
        });

        for (let i = 0; i < 70; i++) {
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          particlesArray.push({
            x, y,
            baseX: x, baseY: y,
            radius: Math.random() * 2 + 1,
            color: getComputedParticleColor(),
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
          });
        }

        let currentParticleColor = getComputedParticleColor();
        let frameCount = 0;

        function animate() {
          frameCount++;
          if (frameCount % 10 === 0) {
            currentParticleColor = getComputedParticleColor();
          }
          ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
          ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

          const now = performance.now();
          let influence = 1;
          if (releaseActive) {
            const t = Math.min(1, (now - releaseStart) / 5000);
            influence = 1 - easeOutCubic(t);
            if (t >= 1) {
              releaseActive = false;
              mouseSuppressed = true;
            }
          } else if (mouseSuppressed) {
            influence = 0;
          }

          if (
            !releaseActive &&
            !mouseSuppressed &&
            now - lastMouseTs > 20000 &&
            mouse.x != null && mouse.y != null &&
            frameCount % 20 === 0
          ) {
            let nearby = 0;
            const radius = 160;
            for (let i = 0; i < particlesArray.length; i++) {
              const dx = particlesArray[i].x - mouse.x;
              const dy = particlesArray[i].y - mouse.y;
              if (dx * dx + dy * dy < radius * radius) nearby++;
            }
            if (nearby > 18) triggerRelease();
          }

          particlesArray.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = currentParticleColor;
            ctx.shadowColor = currentParticleColor;
            ctx.shadowBlur = 4;
            ctx.fill();

            p.x += p.dx;
            p.y += p.dy;

            if (!mouseSuppressed && mouse.x != null && mouse.y != null) {
              const dx = mouse.x - p.x;
              const dy = mouse.y - p.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const maxDistance = 400;
              if (distance < maxDistance) {
                let force = 0.005 * (1 - distance / maxDistance);
                force *= influence;
                p.x += dx * force;
                p.y += dy * force;
              }
            }

            p.x += p.vx;
            p.y += p.vy;

            const damp = releaseActive ? 0.98 : 0.995;
            p.vx *= damp;
            p.vy *= damp;

            if (Math.abs(p.vx) > 0.35) p.vx *= 0.9;
            if (Math.abs(p.vy) > 0.35) p.vy *= 0.9;

            if (p.x <= 0 || p.x >= window.innerWidth) p.vx *= -1;
            if (p.y <= 0 || p.y >= window.innerHeight) p.vy *= -1;
            if (p.x < 0 || p.x > window.innerWidth) p.dx = -p.dx;
            if (p.y < 0 || p.y > window.innerHeight) p.dy = -p.dy;
          });

          for (let i = 0; i < particlesArray.length; i++) {
            let connections = 0;
            for (let j = i + 1; j < particlesArray.length && connections < 3; j++) {
              const dx = particlesArray[i].x - particlesArray[j].x;
              const dy = particlesArray[i].y - particlesArray[j].y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < 120) {
                const opacity = 1 - distance / 120;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
                ctx.lineWidth = 1;
                ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                ctx.stroke();
                connections++;
              }
            }
          }
          const id = requestAnimationFrame(animate);
          animationIds.push(id);
        }
        animate();
      }

      // Extra particles
      const extraCanvas = document.getElementById('extra-particles') as HTMLCanvasElement;
      if (extraCanvas) {
        const ctxExtra = extraCanvas.getContext('2d')!;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        extraCanvas.width = Math.floor(window.innerWidth * dpr);
        extraCanvas.height = Math.floor(window.innerHeight * dpr);
        ctxExtra.setTransform(dpr, 0, 0, dpr, 0, 0);

        const extraParticles = [];
        for (let i = 0; i < 100; i++) {
          extraParticles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 2 + 1,
            dx: (Math.random() - 0.5) * 0.3,
            dy: (Math.random() - 0.5) * 0.3,
          });
        }

        function animateExtra() {
          ctxExtra.clearRect(0, 0, window.innerWidth, window.innerHeight);
          extraParticles.forEach((p) => {
            ctxExtra.beginPath();
            ctxExtra.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctxExtra.fillStyle = 'rgba(255,255,255,0.5)';
            ctxExtra.fill();

            p.x += p.dx;
            p.y += p.dy;

            if (p.x <= 0 || p.x >= window.innerWidth) p.dx *= -1;
            if (p.y <= 0 || p.y >= window.innerHeight) p.dy *= -1;
          });
          const id = requestAnimationFrame(animateExtra);
          animationIds.push(id);
        }
        animateExtra();
      }
    };

    // Initialize particles after a brief delay
    const timeout = setTimeout(initParticles, 100);

    return () => {
      clearTimeout(timeout);
      animationIds.forEach(id => cancelAnimationFrame(id));
    };
  }, []);

  // Handle email submission
  const handleEmailSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isValidEmail(email) || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store',
        body: JSON.stringify({ email })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { ok: false };
      }

      // Check for successful email send, even if database failed
      if (data.id) {
        // If we have an email ID, the email was successfully sent even if database failed
        setEmail('');
        
        // Update UI with any count data we received, or keep current values
        if (typeof data.count === 'number' && typeof data.goal === 'number') {
          setCount(data.count);
          const percentage = Math.max(0, Math.min(100, (data.count / data.goal) * 100));
          
          // Reset animation state to allow new animation
          setAnimationStarted(false);
          
          // Update target progress to trigger new animation
          setTargetProgress(percentage);
          setProgressVisible(true);
          
          console.log(`🎯 FORM SUBMISSION: Updated progress to ${percentage.toFixed(2)}% (${data.count}/${data.goal})`);
        }
        
        showToast({
          title: "You're in!",
          message: "Thanks for joining early access to SoundChain.",
          icon: "🎉"
        });
      } else if (response.status === 409) {
        // Handle duplicate email case
        showToast({
          title: "Already registered",
          message: "This email is already on our waitlist.",
          icon: "ℹ️"
        });
      } else {
        // Handle other errors
        showToast({
          title: "Oops!",
          message: data.error || `There was an error. Please try again.`,
          icon: "❌"
        });
      }
    } catch (error) {
      showToast({
        title: "Oops!",
        message: "There was an error. Please try again.",
        icon: "❌"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      {/* Background layers - all fixed positioned */}
      <div className="animated-gradient" style={{ pointerEvents: 'none' }} />
      <canvas
        id="particles-background"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          opacity: 0.5,
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <canvas
        id="particles"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          opacity: 0.8,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />
      <canvas
        id="extra-particles"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 20
        }}
      />
      
      {/* Main content */}
      <div className="relative text-white font-inter" style={{ minHeight: 'auto' }}>
        <div className="content-wrapper relative z-20">
          <main className="flex-grow">
          {/* Hero Section */}
          <header style={{ 
            maxWidth: '896px', 
            margin: '0 auto', 
            textAlign: 'center', 
            padding: '48px 16px', 
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Logo - always visible, properly spaced */}
            <div 
              style={{ display: 'flex', justifyContent: 'center', marginBottom: '-60px' }} 
              className="logo-always-visible"
              data-reveal
              data-delay="0"
              data-sequence="1"
            >
              <img
                src="/logo.png"
                alt="SoundChain Logo"
                style={{ width: '630px', maxWidth: '100%', height: 'auto', pointerEvents: 'none' }}
                className="logo-pulse"
              />
            </div>

            {/* Title - scroll-triggered on mobile, immediate on desktop */}
            <h1
              style={{ 
                fontSize: 'clamp(36px, 8vw, 64px)', 
                fontWeight: 'bold', 
                marginBottom: '32px', 
                lineHeight: '1.15' 
              }}
              className="hero-gradient-text hero-glow mobile-scroll-reveal"
              data-reveal
              data-delay="200"
              data-sequence="2"
            >
              SoundChain – Music, Ownership, Community.
            </h1>

            {/* Description - exactly like original */}
            <div
              data-reveal
              {...(isMobile ? { 'data-sequence': '3', 'data-delay': '400' } : { 'data-delay': '200' })}
            >
              <p style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginTop: '32px', marginBottom: '20px' }} className="hero-subtitle">
                Own the music you love. Discover the future of music with Web3.
              </p>
              <p style={{ 
                fontSize: 'clamp(16px, 2.5vw, 20px)', 
                color: '#d1d5db', 
                maxWidth: '800px', 
                margin: '8px auto 32px auto',
                lineHeight: '1.4' 
              }}>
                A new <span className="hero-highlight">music platform</span> that empowers artists, fans, and creators
                through blockchain.{' '}
                <span style={{ whiteSpace: 'nowrap' }}>
                  <span className="hero-highlight">Music</span>, <span className="hero-highlight">NFTs</span>, <span className="hero-highlight">rewards</span>, and <span className="hero-highlight">exclusive communities</span> — all in one ecosystem.
                </span>
              </p>
            </div>

            {/* CTA Form - with enhanced hover animations */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              marginTop: '40px', 
              gap: '20px' 
            }} data-reveal data-delay="400">
              <input
                type="email"
                placeholder="Enter your email"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  width: '384px',
                  maxWidth: '90vw',
                  color: 'white',
                  background: 'transparent',
                  border: '2px solid #8B5FFF',
                  outline: 'none',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 0 transparent'
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 95, 255, 0.4)';
                  e.currentTarget.style.borderColor = '#a58fff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 transparent';
                  e.currentTarget.style.borderColor = '#8B5FFF';
                }}
                onMouseEnter={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(139, 95, 255, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.boxShadow = '0 0 0 transparent';
                  }
                }}
              />
              <button
                onClick={handleEmailSubmit}
                style={{
                  background: (!isValidEmail(email) || isSubmitting) ? '#6b7280' : '#8B5FFF',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  border: 'none',
                  cursor: (!isValidEmail(email) || isSubmitting) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: 1,
                  boxShadow: (!isValidEmail(email) || isSubmitting) ? 'none' : '0 4px 15px rgba(139, 95, 255, 0.3)',
                  transform: 'scale(1)'
                }}
                disabled={!isValidEmail(email) || isSubmitting}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 95, 255, 0.6)';
                    e.currentTarget.style.background = '#7a4fe0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 95, 255, 0.3)';
                    e.currentTarget.style.background = '#8B5FFF';
                  }
                }}
                onMouseDown={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
              >
                {isSubmitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
          </header>

          {/* Progress Section - matching original design */}
          <section
            id="progress-section"
            style={{
              maxWidth: '896px',
              margin: '0 auto 48px auto',
              padding: '0 16px',
              width: '100%',
              boxSizing: 'border-box'
            }}
            data-visible={progressVisible ? 'true' : 'false'}
            data-reveal
            data-delay="600"
          >
            <div 
              className="signup-progress mb-2" 
              role="progressbar" 
              aria-valuemin={0}
              aria-valuemax={100} 
              aria-valuenow={Math.round(progress)}
            >
              {/* Progress fill that clips/masks the visualizer */}
              <div
                className="signup-progress-fill"
                style={{ 
                  width: `${Math.max(0, Math.min(progress, 100))}%`,
                  transition: 'width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
              >
                {/* Audio visualizer that spans the FULL progress bar width but is clipped by the fill */}
                <div className="audio-visualizer-container">
                  <div className="progress-bars">
                    <div className="progress-bar-segment" style={{ height: '60%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '80%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '40%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '90%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '70%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '50%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '85%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '65%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '75%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '55%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '95%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '45%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '72%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '88%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '63%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '78%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '52%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '92%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '67%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '81%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '48%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '74%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '86%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '59%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '76%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '43%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '89%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '64%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '77%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '51%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '83%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '58%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '91%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '46%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '73%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '62%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '87%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '54%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '79%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '49%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '84%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '68%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '93%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '41%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '71%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '56%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '82%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '47%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '75%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '61%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '90%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '53%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '78%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '44%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '85%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '69%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '94%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '42%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '76%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '57%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '88%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '50%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '81%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '66%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '92%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '45%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '73%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '60%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '86%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '52%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '79%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '48%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '87%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '63%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '91%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '41%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '74%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '58%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '84%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '46%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '77%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '54%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '89%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '43%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '72%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '59%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '85%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '51%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '80%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '67%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '93%' }}></div>
                    <div className="progress-bar-segment" style={{ height: '49%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-gray-400">{count.toLocaleString('en-US')} out of {goal.toLocaleString('en-US')} people joined</p>
          </section>

          {/* Benefits Section - Desktop: section reveals as a whole; Mobile: staggered individual cards */}
          <section
            className="benefits-section"
            {...(!isMobile ? { 'data-reveal': true, 'data-delay': '800' } : {})}
          >
            <div
              className="benefit-card"
              data-reveal={isMobile ? "true" : "false"}
              data-sequence={isMobile ? "1" : "0"}
              data-delay={isMobile ? "600" : "0"}
              style={{
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                padding: '16px',
                borderRadius: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img src="/nft.png" alt="NFT Icon" style={{ width: '56px', height: '56px', margin: '0 auto 16px auto' }} />
              <h3 style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '8px', color: 'white' }}>NFT Releases</h3>
              <p style={{ color: '#9ca3af' }}>Own your favorite tracks</p>
            </div>
            <div
              className="benefit-card"
              data-reveal={isMobile ? "true" : "false"}
              data-sequence={isMobile ? "2" : "0"}
              data-delay={isMobile ? "900" : "0"}
              style={{
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                padding: '16px',
                borderRadius: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img src="/community.png" alt="Community Icon" style={{ width: '56px', height: '56px', margin: '0 auto 16px auto' }} />
              <h3 style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '8px', color: 'white' }}>Community Rewards</h3>
              <p style={{ color: '#9ca3af' }}>Support artists, get rewards</p>
            </div>
            <div
              className="benefit-card"
              data-reveal={isMobile ? "true" : "false"}
              data-sequence={isMobile ? "3" : "0"}
              data-delay={isMobile ? "1200" : "0"}
              style={{
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                padding: '16px',
                borderRadius: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img src="/creator.png" alt="Creator Icon" style={{ width: '56px', height: '56px', margin: '0 auto 16px auto' }} />
              <h3 style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '8px', color: 'white' }}>Creator Economy</h3>
              <p style={{ color: '#9ca3af' }}>Fair splits for artists & producers</p>
            </div>
          </section>
          </main>
               {/* Footer */}
        <footer 
          style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}
          data-reveal 
          data-delay="1400"
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
            <a
              href="https://x.com/joinsoundchain"
              aria-label="X (Twitter)"
              className="social-icon-wrapper"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/twitter-icon.svg" alt="X" className="social-icon-img" />
            </a>
            <a
              href="https://www.instagram.com/joinsoundchain/?utm_source=ig_web_button_share_sheet"
              aria-label="Instagram"
              className="social-icon-wrapper"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/instagram-icon.svg" alt="Instagram" className="social-icon-img" />
            </a>
          </div>
          <p>Coming soon — Powered by Web3</p>
        </footer>
        </div>
      </div>
    </>
  );
}
