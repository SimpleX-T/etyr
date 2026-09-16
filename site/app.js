/* ================================================================
   Etyr landing — interactive demo + reveal + showcase renderer
   ================================================================ */
;(function () {
  'use strict'

  /* ---- Word data (mirrors real API surface) ---- */
  const WORDS = {
    etyr: {
      word: 'etyr',
      phonetic: '/ˈiːtər/',
      meanings: [
        {
          pos: 'noun',
          definitions: [
            {
              text: 'A reading companion that surfaces meaning without breaking focus.',
              examples: [
                'He installed Etyr to instantly understand obscure words in the article.'
              ]
            }
          ],
          synonyms: ['aether', 'quintessence'],
          antonyms: []
        },
        {
          pos: 'noun',
          definitions: [
            {
              text: 'The clear sky; the upper regions of air beyond the clouds.',
              examples: [
                'The birds vanished into the etyr.'
              ]
            }
          ]
        }
      ]
    },
    verisimilitude: {
      word: 'verisimilitude',
      phonetic: '/ˌvɛrɪsɪˈmɪlɪtjuːd/',
      meanings: [
        {
          pos: 'noun',
          forms: 'plural verisimilitudes',
          definitions: [
            {
              text: 'The appearance of being true or real.',
              examples: [
                "Her novel is praised for its verisimilitude.",
                "The verisimilitude of the film's period setting drew praise."
              ],
              quote: {
                text: 'A strange verisimilitude envelops the whole thing, as if the story were a real history.',
                cite: '— Jorge Luis Borges, "Tlön, Uqbar, Orbis Tertius"'
              }
            }
          ],
          synonyms: ['realism', 'authenticity', 'fidelity', 'plausibility'],
          antonyms: ['implausibility', 'falseness']
        }
      ]
    },
    elated: {
      word: 'elated',
      phonetic: '/ɪˈleɪtɪd/',
      meanings: [
        {
          pos: 'adjective',
          forms: 'comparative more elated · superlative most elated',
          definitions: [
            {
              text: 'Extremely happy and excited; overjoyed.',
              examples: [
                'She was elated by the news of her promotion.',
                'An elated crowd poured into the streets to celebrate.'
              ]
            }
          ],
          synonyms: ['euphoric', 'thrilled', 'overjoyed', 'jubilant'],
          antonyms: ['despondent', 'miserable']
        },
        {
          pos: 'verb',
          definitions: [
            {
              text: 'Past tense and past participle of elate.',
              examples: ["The victory elated the entire team."],
              subsenses: [
                {
                  text: 'Figuratively, to raise the spirits of.',
                  examples: ['Good news elated her spirits.']
                }
              ]
            }
          ]
        }
      ]
    },
    decade: {
      word: 'decade',
      phonetic: '/ˈdɛkeɪd/',
      meanings: [
        {
          pos: 'noun',
          forms: 'plural decades',
          definitions: [
            {
              text: 'A period of ten years.',
              examples: [
                'The technology advanced dramatically over the decade.',
                'She lived abroad for nearly a decade.'
              ],
              quote: {
                text: 'The next decade may well prove the most decisive in the history of the Republic.',
                cite: '— Alexei Yurchak, "Everything Was Forever, Until It Was No More"'
              }
            }
          ],
          synonyms: ['ten years', 'decennium'],
          antonyms: []
        }
      ],
      linked: [
        { query: 'decades', label: 'plural of decade' }
      ]
    },
    decades: {
      word: 'decades',
      phonetic: '/ˈdɛkeɪdz/',
      meanings: [
        {
          pos: 'noun',
          definitions: [
            {
              text: 'Plural of decade.',
              linked: [{ query: 'decade', label: 'decade' }]
            }
          ]
        }
      ],
      linked: [{ query: 'decade', label: 'See decade' }]
    }
  }

  /* ---- Render tooltip HTML ---- */
  function renderTooltip (data, breadcrumb) {
    const m = data.meanings[0]
    const def = m.definitions[0]
    const synChips = (m.synonyms || []).slice(0, 3).map(w =>
      `<button class="etyr-definition__chip" data-link="${w}">${w}</button>`
    ).join('')
    const antChips = (m.antonyms || []).slice(0, 3).map(w =>
      `<button class="etyr-definition__chip" data-link="${w}">${w}</button>`
    ).join('')
    const synMore = m.synonyms && m.synonyms.length > 3 ? `<button class="etyr-definition__more etyr-definition__more--inline">+${m.synonyms.length - 3} more</button>` : ''
    const exBlock = (def.examples || []).map(e =>
      `<p class="etyr-definition__example">"${e}"</p>`
    ).join('')
    const quoteBlock = def.quote
      ? `<div class="etyr-definition__quotes"><div class="etyr-definition__quote-row"><blockquote class="etyr-definition__quote"><p class="etyr-definition__quote-text">"${def.quote.text}"</p><cite class="etyr-definition__quote-ref">${def.quote.cite}</cite></blockquote></div></div>`
      : ''
    const subBlock = (def.subsenses || []).map(s =>
      `<li class="etyr-definition__item etyr-definition__item--depth-1">
        <div class="etyr-definition__sense-row"><p class="etyr-definition__text">${s.text}</p></div>
        <div class="etyr-definition__examples">${(s.examples || []).map(e => `<p class="etyr-definition__example">"${e}"</p>`).join('')}</div>
      </li>`
    ).join('')
    const subBlockHtml = subBlock ? `<ul class="etyr-definition__subsenses">${subBlock}</ul>` : ''
    const linkBlock = (data.linked || []).map(l =>
      `<li class="etyr-definition__item etyr-definition__item--depth-0"><div class="etyr-definition__sense-row"><p class="etyr-definition__text">See also <button class="etyr-definition__link" data-link="${l.query}">${l.label}</button></p></div></li>`
    ).join('')

    return `
      <div class="etyr-tooltip-container" style="display:contents">
        <div class="etyr-tooltip etyr-glass etyr-tooltip--showing" style="position:static; width:100%; box-shadow:none; animation:none; transform:none">
          <div class="etyr-tooltip__header">
            <div class="etyr-tooltip__title">
              ${breadcrumb ? `<div class="etyr-tooltip__breadcrumb"><span class="etyr-tooltip__back-label">${breadcrumb}</span></div>` : ''}
              <span class="etyr-tooltip__word">${data.word}</span>
              <span class="etyr-tooltip__phonetic">${data.phonetic}</span>
            </div>
            <div class="etyr-tooltip__controls">
              <button class="etyr-icon-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></button>
              <button class="etyr-icon-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>
              <button class="etyr-icon-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></button>
            </div>
          </div>
          <div class="etyr-tooltip__body">
            <div class="etyr-definition">
              <div class="etyr-definition__meanings">
                <div class="etyr-definition__meaning">
                  <div class="etyr-definition__meaning-head">
                    <span class="etyr-definition__pos">${m.pos}</span>
                    ${m.forms ? `<span class="etyr-definition__forms"><span class="etyr-definition__form">${m.forms}</span></span>` : ''}
                  </div>
                  <ol class="etyr-definition__list">
                    <li class="etyr-definition__item etyr-definition__item--depth-0">
                      <div class="etyr-definition__sense-row">
                        <p class="etyr-definition__text">${def.text.replace(/<a data-link="([^"]+)".*?>(.*?)<\/a>/, '<button class="etyr-definition__link" data-link="$1">$2</button>')}</p>
                      </div>
                      <div class="etyr-definition__examples">${exBlock}</div>
                      ${quoteBlock}
                      ${subBlockHtml}
                    </li>
                    ${linkBlock}
                  </ol>
                  ${synChips ? `<p class="etyr-definition__wordlist"><span class="etyr-definition__wordlist-label">Synonyms: </span>${synChips}${synMore}</p>` : ''}
                  ${antChips ? `<p class="etyr-definition__wordlist"><span class="etyr-definition__wordlist-label">Antonyms: </span>${antChips}</p>` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="etyr-tooltip__footer">
            <div class="etyr-tooltip__footer-left">
              <button class="etyr-tooltip__action etyr-tooltip__copy-entry"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> <span>Copy</span></button>
            </div>
          </div>
        </div>
      </div>`
  }

  /* ---- Demo interactivity ---- */
  const sentence = document.getElementById('sentence')
  const tip = document.getElementById('demoTooltip')
  const stage = sentence.closest('.demo-stage')

  function positionTip (wordEl) {
    const stageRect = stage.getBoundingClientRect()
    const wordRect = wordEl.getBoundingClientRect()
    const tipW = Math.min(340, window.innerWidth - 40)
    const left = Math.max(8, Math.min(
      wordRect.left - stageRect.left + wordRect.width / 2 - tipW / 2,
      stageRect.width - tipW - 8
    ))
    tip.style.left = left + 'px'
    tip.style.top = '0px'
    tip.style.transform = 'translateY(calc(-100% - 16px))'
  }

  function showTip (wordEl) {
    const key = wordEl.dataset.word
    if (!WORDS[key]) return
    tip.innerHTML = renderTooltip(WORDS[key])
    tip.hidden = false
    positionTip(wordEl)

    // Wire chip / link clicks for cross-reference navigation
    tip.querySelectorAll('[data-link]').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault()
        const q = this.dataset.link
        if (WORDS[q]) {
          tip.innerHTML = renderTooltip(WORDS[q], `${key} →`)
          // Re-position after content change
          positionTip(wordEl)
        }
      })
    })
  }

  sentence.addEventListener('click', function (e) {
    const wordEl = e.target.closest('.demo-word')
    if (!wordEl) { tip.hidden = true; return }
    e.preventDefault()
    // Close if same word
    if (!tip.hidden && tip.dataset.active === wordEl.dataset.word) {
      tip.hidden = true
      delete tip.dataset.active
      return
    }
    tip.dataset.active = wordEl.dataset.word
    showTip(wordEl)
  })

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!tip.hidden && !e.target.closest('.demo-tooltip') && !e.target.closest('.demo-word')) {
      tip.hidden = true
      delete tip.dataset.active
    }
  })

  /* ---- Showcase static render ---- */
  const scCard = document.getElementById('showcaseCard')
  if (scCard) {
    scCard.innerHTML = renderTooltip(WORDS.etyr)
  }

  /* ---- Scroll reveal ---- */
  const reveals = document.querySelectorAll('.card,.privacy-card,.etyr-card,.showcase-caption')
  reveals.forEach(el => el.setAttribute('data-reveal', ''))
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed')
        io.unobserve(entry.target)
      }
    })
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
  reveals.forEach(el => io.observe(el))

  /* ---- Sticky nav border ---- */
  const nav = document.querySelector('.nav')
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 12)
    }, { passive: true })
  }
})()
