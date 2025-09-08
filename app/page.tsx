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

  // Sequential scroll-based reveal system
  useEffect(() => {
    const startTime = performance.now();
    
    // PRODUCTION DEBUG: Environment check
    console.log('\\n🔍 SCROLL SYSTEM INITIALIZATION:');
    console.log(`  - Environment: ${process.env.NODE_ENV || 'unknown'}`);
    console.log(`  - Window size: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`  - Device type: ${window.innerWidth <= 768 ? 'MOBILE' : 'DESKTOP'}`);
    console.log(`  - Scroll position: ${window.scrollY}px`);
    console.log(`  - Document state: ${document.readyState}`);
    console.log(`  - Body dimensions: ${document.body.offsetWidth}x${document.body.offsetHeight}`);
    console.log(`  - React hydration complete: ${document.documentElement.hasAttribute('data-reactroot') || document.querySelector('#__next') !== null}`);
    
    // Check if critical elements exist
    const criticalElements = {
      'logo': document.querySelector('.logo-always-visible'),
      'title': document.querySelector('.mobile-scroll-reveal'),
      'progress': document.querySelector('#progress-section'),
      'benefits': document.querySelector('.benefits-section')
    };
    
    console.log('\\n🎯 CRITICAL ELEMENTS CHECK:');
    Object.entries(criticalElements).forEach(([name, element]) => {
      console.log(`  - ${name}: ${element ? '✅ Found' : '❌ Missing'}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        console.log(`    Position: ${Math.round(rect.top)}px top, ${Math.round(rect.left)}px left`);
        console.log(`    Size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        console.log(`    Visible: ${rect.width > 0 && rect.height > 0}`);
      }
    });
    
    console.log(`\n🔧 SCROLL SYSTEM DEBUG MODE - Device: ${window.innerWidth <= 768 ? 'MOBILE' : 'DESKTOP'}`);
    
    // Check if elements are actually hidden by CSS initially
    const checkCSSStates = () => {
      const revealElements = document.querySelectorAll('[data-reveal]');
      console.log(`\n🎨 CSS STATE CHECK - Found ${revealElements.length} reveal elements:`);
      
      if (revealElements.length === 0) {
        console.log('  ⚠️ NO REVEAL ELEMENTS FOUND! This is likely the problem.');
        console.log('  🔍 Checking if DOM is fully ready...');
        console.log(`    - Document ready: ${document.readyState}`);
        console.log(`    - Body exists: ${!!document.body}`);
        console.log(`    - All scripts loaded: ${document.scripts.length} scripts`);
        
        // Try to find elements without data-reveal
        const titleElement = document.querySelector('h1');
        console.log(`    - Found h1 element: ${!!titleElement}`);
        if (titleElement) {
          console.log(`    - H1 classes: "${titleElement.className}"`);
        }
      }
      
      revealElements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlElement);
        const elementName = element.tagName + (element.id ? `#${htmlElement.id}` : '') + (element.className ? `.${element.className.split(' ')[0]}` : '');
        
        console.log(`   ${index + 1}. ${elementName}:`);
        console.log(`      🎨 CSS opacity: ${computedStyle.opacity}`);
        console.log(`      🎨 CSS transform: ${computedStyle.transform}`);
        console.log(`      🎨 CSS visibility: ${computedStyle.visibility}`);
        console.log(`      🎨 CSS display: ${computedStyle.display}`);
        console.log(`      📏 Element visible: ${htmlElement.offsetWidth > 0 && htmlElement.offsetHeight > 0}`);
        console.log(`      🏷️ Full className: "${htmlElement.className}"`);
        console.log(`      🏷️ Has 'mobile-scroll-reveal': ${htmlElement.classList.contains('mobile-scroll-reveal')}`);
        console.log(`      📍 Rect: top=${Math.round(element.getBoundingClientRect().top)}px, height=${Math.round(element.getBoundingClientRect().height)}px`);
        
        // PRODUCTION DEBUG: Check if CSS is loading correctly
        const styles = window.getComputedStyle(htmlElement);
        if (styles.opacity === '1' && window.innerWidth > 768 && htmlElement.classList.contains('mobile-scroll-reveal')) {
          console.log(`      🚨 PRODUCTION ISSUE: Desktop title visible immediately (opacity: ${styles.opacity})`);
        }
      });
    };
    
    // Check immediately and after delays to catch timing issues
    console.log('\\n⏱️ TIMING DEBUG:');
    console.log(`  - Initial check at ${Math.round(performance.now() - startTime)}ms`);
    checkCSSStates();
    
    setTimeout(() => {
      console.log(`\n  - Delayed check at ${Math.round(performance.now() - startTime)}ms`);
      checkCSSStates();
    }, 100);
    
    setTimeout(() => {
      console.log(`\n  - Final check at ${Math.round(performance.now() - startTime)}ms`);
      checkCSSStates();
    }, 500);
    
    // Logo fade-in animation on page load (separate from scroll system)
    const animateLogo = () => {
      const logo = document.querySelector('.logo-always-visible');
      if (logo) {
        const logoElement = logo as HTMLElement;
        console.log(`🎭 LOGO INITIAL STATE:`);
        console.log(`   Opacity: ${window.getComputedStyle(logoElement).opacity}`);
        console.log(`   Transform: ${window.getComputedStyle(logoElement).transform}`);
        
        // Set initial hidden state immediately
        logoElement.style.opacity = '0';
        logoElement.style.transform = 'translateY(20px) scale(0.95)';
        logoElement.style.visibility = 'hidden';
        logoElement.style.transition = 'none';
        
        console.log(`🎭 LOGO AFTER HIDING:`);
        console.log(`   Opacity: ${logoElement.style.opacity}`);
        console.log(`   Transform: ${logoElement.style.transform}`);
        
        // After a brief moment, set up the transition and make visible
        setTimeout(() => {
          logoElement.style.transition = 'opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          logoElement.style.visibility = 'visible';
          
          console.log(`🎭 LOGO TRANSITION SETUP COMPLETE`);
          
          // Start the fade-in animation immediately after making visible
          setTimeout(() => {
            logoElement.style.opacity = '1';
            logoElement.style.transform = 'translateY(0) scale(1)';
            console.log(`🎭 LOGO ANIMATION TRIGGERED`);
          }, 50);
        }, 200);
      }
    };
    
    // Start logo animation
    animateLogo();
    
    // Track which elements have been revealed to prevent re-revealing
    const revealedElements = new Set<HTMLElement>();
    
    // PRODUCTION FIX: Track page load time to prevent immediate title reveals
    const pageLoadTime = performance.now();
    const MIN_TIME_BEFORE_TITLE_REVEAL = 1000; // Wait at least 1 second after page load
    
    // DEBUG: Track intersection events for desktop title
    let desktopTitleIntersectionCount = 0;
    let desktopTitleLastScrollY = -1;
    let desktopTitleRevealAttempts = [];
    
    console.log('🔧 DESKTOP TITLE DEBUG: Tracking system initialized');
    console.log(`   - pageLoadTime: ${Math.round(pageLoadTime)}ms`);
    console.log(`   - MIN_TIME_BEFORE_REVEAL: ${MIN_TIME_BEFORE_TITLE_REVEAL}ms`);
    console.log(`   - Current scrollY: ${window.scrollY}px`);
    console.log(`   - Window size: ${window.innerWidth}x${window.innerHeight}`);
    
    // Track scroll changes for debugging
    window.addEventListener('scroll', () => {
      if (Math.abs(window.scrollY - desktopTitleLastScrollY) > 5) { // Only log significant scroll changes
        console.log(`📜 SCROLL DEBUG: ${desktopTitleLastScrollY}px → ${window.scrollY}px (${window.scrollY > desktopTitleLastScrollY ? 'DOWN' : 'UP'})`);
        desktopTitleLastScrollY = window.scrollY;
      }
    }, { passive: true });
    
    // Sequential animation queue to ensure proper order
    const animationQueue = new Map<HTMLElement, { delay: number, triggerTime: number, canReveal: boolean }>();
    let lastRevealedIndex = -1;
    const revealOrder = []; // Will store elements in DOM order
    
    // Function to check if an element can be revealed (respects sequential order)
    const canRevealElement = (element: HTMLElement): boolean => {
      const currentIndex = revealOrder.indexOf(element);
      if (currentIndex === -1) return false;
      
      // First element can always be revealed
      if (currentIndex === 0) return true;
      
      // Check if previous element has been revealed
      const previousElement = revealOrder[currentIndex - 1];
      return revealedElements.has(previousElement);
    };
    
    // Function to process pending animations
    const processPendingAnimations = () => {
      animationQueue.forEach((queueData, element) => {
        if (!queueData.canReveal && canRevealElement(element)) {
          queueData.canReveal = true;
          const elementName = element.tagName + (element.id ? `#${element.id}` : '') + (element.className ? `.${element.className.split(' ')[0]}` : '');
          
          console.log(`🔓 UNLOCKED: ${elementName} can now animate (previous element completed)`);
          
          // Start the animation
          setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            element.style.filter = 'blur(0)';
            element.classList.add('revealed');
            revealedElements.add(element);
            
            const revealTime = performance.now() - startTime;
            console.log(`✅ ${elementName} REVEALED at ${Math.round(revealTime)}ms`);
            
            // Remove from queue and process next
            animationQueue.delete(element);
            processPendingAnimations();
          }, queueData.delay);
        }
      });
    };
    
    // Function to handle element intersection
    const handleElementIntersection = (element: HTMLElement, isIntersecting: boolean, rect: DOMRect, elementName: string, isFooter = false) => {
      const viewport = window.innerHeight;
      const distanceFromTop = rect.top;
      const spaceRemaining = viewport - rect.bottom;
      const isMobile = window.innerWidth <= 768;
      
      if (isIntersecting && !revealedElements.has(element) && !animationQueue.has(element)) {
        const delay = parseInt(element.getAttribute('data-delay') || '0');
        const triggerTime = performance.now() - startTime;
        
        console.log(`📢 TRIGGER: ${elementName} at ${Math.round(triggerTime)}ms`);
        console.log(`   📍 Position: ${Math.round(distanceFromTop)}px from top, ${Math.round(spaceRemaining)}px space below`);
        console.log(`   ⏱️ Delay: ${delay}ms, will reveal at ${Math.round(triggerTime + delay)}ms`);
        
        if (canRevealElement(element)) {
          // Can reveal immediately
          revealedElements.add(element);
          console.log(`🚀 IMMEDIATE: ${elementName} animating now`);
          
          setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            element.style.filter = 'blur(0)';
            element.classList.add('revealed');
            
            const revealTime = performance.now() - startTime;
            
            // DEBUG: Special logging for desktop title reveals
            const isDesktopTitle = element.classList.contains('mobile-scroll-reveal') && window.innerWidth > 768;
            if (isDesktopTitle) {
              const timeSincePageLoad = performance.now() - pageLoadTime;
              console.log(`🎉 DESKTOP TITLE ACTUALLY REVEALED!`);
              console.log(`   - Element: ${elementName}`);
              console.log(`   - Time: ${Math.round(revealTime)}ms after script start`);
              console.log(`   - Time since page load: ${Math.round(timeSincePageLoad)}ms`);
              console.log(`   - ScrollY when revealed: ${window.scrollY}px`);
              console.log(`   - Total intersection attempts: ${desktopTitleIntersectionCount}`);
              console.log(`   - Reveal attempts history:`, desktopTitleRevealAttempts);
            }
            
            console.log(`✅ ${elementName} REVEALED at ${Math.round(revealTime)}ms`);
            
            // Special handling for progress section - trigger fill animation
            if (element.id === 'progress-section') {
              console.log('🎯 PROGRESS SECTION REVEALED - Starting fill animation!');
              // Add a small delay to ensure the section is fully visible before animation
              setTimeout(() => {
                setProgressVisible(true);
              }, 100);
            }
            
            // Process any pending animations
            processPendingAnimations();
          }, delay);
        } else {
          // Queue for later
          animationQueue.set(element, { delay, triggerTime, canReveal: false });
          console.log(`⏳ QUEUED: ${elementName} waiting for previous element`);
        }
      } else if (!isIntersecting && !revealedElements.has(element) && !animationQueue.has(element)) {
        // Debug: Show why element didn't trigger
        if (rect.bottom < 0) {
          console.log(`🔴 ${elementName} above viewport (${Math.round(Math.abs(rect.bottom))}px above)`);
        } else if (rect.top > viewport) {
          console.log(`🔴 ${elementName} below viewport (${Math.round(rect.top - viewport)}px below, ${Math.round(spaceRemaining)}px space remaining)`);
        }
      }
    };
    
    // Check device type immediately when creating observers
    const isCurrentlyMobile = window.innerWidth <= 768;
    
    console.log('\\n🔭 OBSERVER SETUP:');
    console.log(`  - Device: ${isCurrentlyMobile ? 'MOBILE' : 'DESKTOP'}`);
    console.log(`  - Threshold: ${isCurrentlyMobile ? '0.1 (10%)' : '0.3 (30%)'}`);
    console.log(`  - Root margin: ${isCurrentlyMobile ? '0px 0px -10% 0px' : '0px 0px -30% 0px'}`);
    
    // Standard observer for most elements - device-responsive settings
    const observer = new IntersectionObserver(
      (entries) => {
        console.log(`\n🔎 INTERSECTION BATCH: ${entries.length} entries`);
        entries.forEach((entry, index) => {
          const element = entry.target as HTMLElement;
          const rect = entry.boundingClientRect;
          const elementName = element.tagName + (element.id ? `#${element.id}` : '') + (element.className ? `.${element.className.split(' ')[0]}` : '');
          
          // Always log intersection events in production debug mode
          console.log(`  ${index + 1}. INTERSECTION: ${elementName}`);
          console.log(`     📊 isIntersecting: ${entry.isIntersecting}`);
          console.log(`     📊 intersectionRatio: ${entry.intersectionRatio.toFixed(3)}`);
          console.log(`     📊 scroll position: ${window.scrollY}px`);
          console.log(`     📊 viewport: ${window.innerHeight}px`);
          console.log(`     📊 element top: ${Math.round(rect.top)}px`);
          console.log(`     📊 element bottom: ${Math.round(rect.bottom)}px`);
          console.log(`     📊 already revealed: ${element.classList.contains('revealed')}`);
          
          // PRODUCTION FIX: Skip desktop title on initial page load
          if (!element.classList.contains('revealed')) {
            // Check if this is the desktop title revealing too early
            if (element.classList.contains('mobile-scroll-reveal') && 
                window.innerWidth > 768) {
              // Desktop title should only reveal after user interaction, not immediately on page load
              desktopTitleIntersectionCount++;
              const timeSincePageLoad = performance.now() - pageLoadTime;
              const isInitialPageLoad = window.scrollY === 0;
              const isTooSoonAfterPageLoad = timeSincePageLoad < MIN_TIME_BEFORE_TITLE_REVEAL;
              
              // LOG ALL INTERSECTION ATTEMPTS
              console.log(`🔍 DESKTOP TITLE INTERSECTION #${desktopTitleIntersectionCount}:`);
              console.log(`   📋 Details:`);
              console.log(`     - isIntersecting: ${entry.isIntersecting}`);
              console.log(`     - intersectionRatio: ${(entry.intersectionRatio * 100).toFixed(1)}%`);
              console.log(`     - scrollY: ${window.scrollY}px`);
              console.log(`     - timeSincePageLoad: ${Math.round(timeSincePageLoad)}ms`);
              console.log(`     - element.top: ${Math.round(rect.top)}px`);
              console.log(`     - element.bottom: ${Math.round(rect.bottom)}px`);
              console.log(`     - viewport.height: ${window.innerHeight}px`);
              console.log(`   🔍 Blocking checks:`);
              console.log(`     - isInitialPageLoad: ${isInitialPageLoad} (scrollY === 0)`);
              console.log(`     - isTooSoonAfterPageLoad: ${isTooSoonAfterPageLoad} (< ${MIN_TIME_BEFORE_TITLE_REVEAL}ms)`);
              console.log(`     - shouldBlock: ${(isInitialPageLoad || isTooSoonAfterPageLoad) && entry.isIntersecting}`);
              
              // Track this attempt
              desktopTitleRevealAttempts.push({
                count: desktopTitleIntersectionCount,
                time: Math.round(timeSincePageLoad),
                scrollY: window.scrollY,
                intersecting: entry.isIntersecting,
                ratio: entry.intersectionRatio,
                blocked: (isInitialPageLoad || isTooSoonAfterPageLoad) && entry.isIntersecting
              });
              
              // Block if it's initial page load OR too soon after page load
              if ((isInitialPageLoad || isTooSoonAfterPageLoad) && entry.isIntersecting) {
                console.log(`     🚨 BLOCKING: Desktop title reveal attempt blocked`);
                console.log(`     📋 Total attempts so far: ${desktopTitleRevealAttempts.length}`);
                console.log(`     📋 Blocked attempts: ${desktopTitleRevealAttempts.filter(a => a.blocked).length}`);
                return; // Skip processing this intersection
              } else {
                console.log(`     ✅ ALLOWING: Desktop title reveal conditions met`);
                console.log(`     🎉 TITLE SHOULD REVEAL NOW!`);
                console.log(`     📋 Attempt history:`, desktopTitleRevealAttempts);
              }
            }
            
            console.log(`     ➡️ Processing intersection for ${elementName}`);
            handleElementIntersection(element, entry.isIntersecting, rect, elementName);
          } else {
            console.log(`     ⏭️ Skipping ${elementName} - already revealed`);
          }
        });
      },
      {
        threshold: isCurrentlyMobile ? 0.1 : 0.3, // More lenient on mobile (10% vs 30%)
        rootMargin: isCurrentlyMobile ? '0px 0px -10% 0px' : '0px 0px -30% 0px' // Less restrictive margin on mobile
      }
    );
    
    console.log('✅ Standard observer created');
    
    // Track scroll behavior for mobile title timing
    let lastScrollY = 0;
    let scrollDirection = 'down';
    let scrollStarted = false;
    
    // Special mobile-only observer for title - much more restrictive
    const mobileTitleObserver = isCurrentlyMobile ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const rect = entry.boundingClientRect;
          const elementName = 'MOBILE TITLE (strict)';
          
          // Only log and handle if not already revealed
          if (!element.classList.contains('revealed')) {
            // Update scroll tracking
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY) {
              scrollDirection = 'down';
              if (!scrollStarted && currentScrollY > 10) {
                scrollStarted = true;
              }
            } else if (currentScrollY < lastScrollY) {
              scrollDirection = 'up';
            }
            lastScrollY = currentScrollY;
            
            console.log(`📱 MOBILE TITLE INTERSECTION:`);
            console.log(`   📊 isIntersecting: ${entry.isIntersecting}`);
            console.log(`   📊 intersectionRatio: ${entry.intersectionRatio.toFixed(3)}`);
            console.log(`   📊 scroll position: ${window.scrollY}px`);
            console.log(`   📊 scroll direction: ${scrollDirection}`);
            console.log(`   📊 user started scrolling: ${scrollStarted}`);
            console.log(`   📊 scroll requirement met: ${window.scrollY > 50 && scrollStarted && scrollDirection === 'down'}`);
            
            // Enhanced requirements: scroll position + user initiated scroll + scrolling down
            if (entry.isIntersecting && window.scrollY > 50 && scrollStarted && scrollDirection === 'down') {
              console.log(`📱 MOBILE TITLE TRIGGER: All conditions met - revealing title`);
              handleElementIntersection(element, entry.isIntersecting, rect, elementName);
            } else {
              console.log(`📱 MOBILE TITLE BLOCKED: scrollY=${window.scrollY}px, started=${scrollStarted}, direction=${scrollDirection}`);
            }
          }
        });
      },
      {
        threshold: 0.2, // Increased threshold - require 20% visibility
        rootMargin: '0px 0px -60% 0px' // More restrictive - 60% from bottom
      }
    ) : null;
    
    // Special footer observer with more lenient settings
    const footerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const rect = entry.boundingClientRect;
          const elementName = 'FOOTER (special)';
          
          // Only log and handle if not already revealed
          if (!element.classList.contains('revealed')) {
            console.log(`🦶 FOOTER INTERSECTION:`);
            console.log(`   📊 isIntersecting: ${entry.isIntersecting}`);
            console.log(`   📊 intersectionRatio: ${entry.intersectionRatio.toFixed(3)}`);
            console.log(`   📊 boundingRect.top: ${rect.top.toFixed(1)}px`);
            
            handleElementIntersection(element, entry.isIntersecting, rect, elementName, true);
          }
        });
      },
      {
        threshold: 0.1, // Only need 10% of footer visible
        rootMargin: '0px 0px 0px 0px' // No restrictive margin - trigger as soon as footer enters viewport
      }
    );

    // Find all elements that need revealing
    setTimeout(() => {
      const isMobile = window.innerWidth <= 768;
      
      // Mobile optimization: Convert single benefits section to individual card reveals
      // FIXED: Do this BEFORE setting up observers to prevent timing issues
      if (isMobile) {
        const benefitsSection = document.querySelector('.benefits-section[data-reveal]');
        if (benefitsSection) {
          // Remove section-level reveal
          benefitsSection.removeAttribute('data-reveal');
          benefitsSection.removeAttribute('data-delay');
          
          // Add individual reveals to each benefit card
          const benefitCards = benefitsSection.querySelectorAll('.benefit-card');
          benefitCards.forEach((card, index) => {
            const cardElement = card as HTMLElement;
            cardElement.setAttribute('data-reveal', '');
            cardElement.setAttribute('data-delay', (800 + index * 200).toString());
          });
          
          console.log(`📱 MOBILE: Converted benefits section to ${benefitCards.length} individual card reveals`);
        }
      } else {
        console.log(`🖥️ DESKTOP: Keeping original benefits section structure`);
      }
      
      // Find all elements that need revealing
      const revealElements = document.querySelectorAll('[data-reveal]');
      console.log(`📋 Found ${revealElements.length} elements to animate`);
      
      // Debug: Show initial positions of all elements
      console.log('\\n🗺️ ELEMENT POSITIONS:');
      
      const footer = document.querySelector('footer[data-reveal]');
      const regularElements = [];
      
      // Build reveal order based on DOM order
      console.log('\\n🗺️ ELEMENT OBSERVATION SETUP:');
      revealElements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const rect = element.getBoundingClientRect();
        const elementName = element.tagName + (element.id ? `#${htmlElement.id}` : '') + (element.className ? `.${element.className.split(' ')[0]}` : '');
        const viewport = window.innerHeight;
        const spaceBelow = viewport - rect.bottom;
        const isVisible = rect.width > 0 && rect.height > 0 && rect.top < viewport && rect.bottom > 0;
        
        revealOrder.push(htmlElement);
        
        console.log(`  ${revealOrder.length}. OBSERVING: ${elementName}`);
        console.log(`     📍 Position: top=${Math.round(rect.top)}px, height=${Math.round(rect.height)}px`);
        console.log(`     📍 Space below: ${Math.round(spaceBelow)}px ${spaceBelow < 100 ? '⚠️ TOO CLOSE!' : '✅'}`);
        console.log(`     📍 Currently visible: ${isVisible}`);
        console.log(`     📍 Order index: ${revealOrder.length - 1}`);
        
        // Check element attributes before observing
        const hasDataReveal = htmlElement.hasAttribute('data-reveal');
        const dataDelay = htmlElement.getAttribute('data-delay');
        console.log(`     🏷️ Has data-reveal: ${hasDataReveal}`);
        console.log(`     🏷️ Data delay: ${dataDelay || 'none'}`);
        
        // Separate footer and mobile title from other elements
        if (element.tagName.toLowerCase() === 'footer') {
          console.log('     📌 → FOOTER OBSERVER (lenient)');
          footerObserver.observe(htmlElement);
        } else if (window.innerWidth <= 768 && htmlElement.classList.contains('mobile-scroll-reveal')) {
          console.log('     📱 → MOBILE TITLE OBSERVER (strict)');
          if (mobileTitleObserver) {
            mobileTitleObserver.observe(htmlElement);
          } else {
            console.log('     ⚠️ MOBILE OBSERVER NOT CREATED!');
          }
        } else if (window.innerWidth > 768 && htmlElement.classList.contains('mobile-scroll-reveal')) {
          // PRODUCTION FIX: Desktop title needs special handling to prevent early reveal
          console.log('     🖥️ → DESKTOP TITLE (delayed standard observer)');
          regularElements.push(element);
          try {
            observer.observe(htmlElement);
            console.log(`     ✅ Successfully observing ${elementName} (desktop title with scroll requirement)`);
          } catch (err) {
            console.log(`     ❌ Failed to observe ${elementName}:`, err);
          }
        } else {
          regularElements.push(element);
          console.log(`     📋 → STANDARD OBSERVER`);
          try {
            observer.observe(htmlElement);
            console.log(`     ✅ Successfully observing ${elementName}`);
          } catch (err) {
            console.log(`     ❌ Failed to observe ${elementName}:`, err);
          }
        }
      });
      
      console.log('\\n🔄 Observer configurations:');
      console.log('   📋 Regular elements:', regularElements.length);
      if (isCurrentlyMobile) {
        console.log('     - MOBILE: threshold: 0.1 (10% visible - lenient for mobile)');
        console.log('     - MOBILE: rootMargin: "0px 0px -10% 0px" (lenient margin)');
      } else {
        console.log('     - DESKTOP: threshold: 0.3 (30% visible - requires scrolling)');
        console.log('     - DESKTOP: rootMargin: "0px 0px -30% 0px" (restrictive margin)');
      }
      console.log('   📱 Mobile title observer:', mobileTitleObserver ? '1' : '0');
      if (mobileTitleObserver) {
        console.log('     - threshold: 0.2 with scrollY > 50px + scroll direction requirements');
        console.log('     - rootMargin: "0px 0px -60% 0px" (very restrictive)');
        console.log('     - requires: user-initiated downward scroll + 50px+ scroll position');
      }
      console.log('   🦶 Footer element:', footer ? '1' : '0');
      if (footer) {
        console.log('     - threshold: 0.1 (10% visible - easy trigger)');
        console.log('     - rootMargin: "0px 0px 0px 0px" (no restrictive margin)');
      }
      
      console.log('\\n✅ SCROLL SHOULD NOW WORK - Removed forced scroll reset!');
    }, 200);
    
    return () => {
      observer.disconnect();
      footerObserver.disconnect();
      if (mobileTitleObserver) {
        mobileTitleObserver.disconnect();
      }
    };
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-60px' }} className="logo-always-visible">
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
            >
              SoundChain – Music, Ownership, Community.
            </h1>

            {/* Description - exactly like original */}
            <div data-reveal data-delay="200">
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

          {/* Benefits Section - Original structure with single data-reveal but individual cards for mobile */}
          <section className="benefits-section" data-reveal data-delay="800">
            <div 
              className="benefit-card"
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
