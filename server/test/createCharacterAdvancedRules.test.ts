import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateCombat, calculateFinalStats, simulateFight, type CombatStats } from '../src/game/gameEngine.js'
import { getCombatRules } from '../src/game/rules/combatRuleStore.js'
import teamAuctionRulesJson from '../src/data/rules/team-auction.json' with { type: 'json' }

const zeroStats = (): CombatStats => ({ chakra: 0, invocation: 0, iq: 0, ninjutsuAttack: 0, ninjutsuDefense: 0, genjutsu: 0, taijutsu: 0, avatar: 0, body: 0, fuinjutsu: 0, senjutsu: 0, kenjutsu: 0, clan: 0, speed: 0, kekkeiGenkai: 0, kekkeiMora: 0 })
function card(name: string, stats: Partial<CombatStats> = {}, clans: string[] = []): object { return { name, slug: name.toLowerCase().replaceAll(' ', '-'), clans, stats: { ...zeroStats(), ...stats } } }
function build(slots: Record<string, object | string>): { slots: Record<string, object | string> } { return { slots } }

const NEW_RULE_IDS = [
  'NO_AVATAR_FINAL_PENALTY',
  'SICK_CARD_BODY_SPEED_ZERO',
  'MADARA_VIEUX_BODY_SPEED_ZERO',
  'OROCHIMARU_MALADE_NINJUTSU_ZERO',
  'OTSUTSUKI_BODY_BOOST',
  'JUUBIDARA_BODY_BOOST',
  'JUUBITO_BODY_BOOST',
  'ITACHI_AVATAR_KENJUTSU_POINTS',
  'MINATO_KENJUTSU_TOBIRAMA_NINJUTSU_BOOST',
  'KAKASHI_DMS_AVATAR_OBITO_NINJUTSU_BOOST',
  'EIGHT_GATES_USERS_TAIJUTSU_IQ_BOOST',
  'JUGO_BODY_SENJUTSU_BOOST',
  'JUBI_AVATAR_KEKKEI_MORA_POINTS',
  'ZETSU_BLANC_BODY_SWAP',
  'OTSUTSUKI_CLAN_CHAKRA_BOOST',
]

// 1-2. Aucun Avatar valide = -15% sur le TOTAL final (jamais stat par stat)
test('1. sans Avatar, le total final subit un nerf de 15%', () => {
  const result = calculateCombat(build({ chakra: card('C', { chakra: 100 }) }))
  assert.equal(result.total, 85)
})
test('2. avec un Avatar présent, aucun malus sur le total', () => {
  const result = calculateCombat(build({ chakra: card('C', { chakra: 100 }), avatar: card('A', { avatar: 50 }) }))
  assert.equal(result.total, 150)
})
test('2b. un Avatar sélectionné mais dont la note finale validée est 0 subit aussi le malus de 15%', () => {
  const result = calculateCombat(build({ chakra: card('C', { chakra: 100 }), avatar: card('A', { avatar: 0 }) }))
  assert.equal(result.total, 85)
  assert.deepEqual(result.appliedRules.find((rule) => rule.ruleId === 'NO_AVATAR_FINAL_PENALTY'), {
    ruleId: 'NO_AVATAR_FINAL_PENALTY',
    label: 'Aucun Avatar valide',
    target: 'total',
    operation: 'percentage',
    value: -0.15,
    before: 100,
    after: 85,
  })
})

// 3-4. Personnage malade en Body => Vitesse forcée à 0
test('3. un personnage malade en Body force la Vitesse à 0', () => {
  const stats = calculateFinalStats(build({ body: 'tsunade-malade', vitesse: card('V', { speed: 80 }) }))
  assert.equal(stats.speed, 0)
})
test('4. la Vitesse reste à 0 malgré un boost potentiel (Huit Portes)', () => {
  const stats = calculateFinalStats(build({ body: 'tsunade-malade', vitesse: card('V', { speed: 80 }), taijutsu: 'rock-lee' }))
  assert.equal(stats.speed, 0)
})

// 5. Madara vieux en Body => Vitesse forcée à 0
test('5. Madara vieux en Body force la Vitesse à 0', () => {
  const stats = calculateFinalStats(build({ body: 'madara-vieux', vitesse: card('V', { speed: 80 }) }))
  assert.equal(stats.speed, 0)
})

// 6-7. Orochimaru malade => Ninjutsu forcé à 0
test('6. Orochimaru malade en Ninjutsu a un Ninjutsu à 0', () => {
  const stats = calculateFinalStats(build({ ninjutsu: 'orochimaru-malade' }))
  assert.equal(stats.ninjutsuAttack, 0)
  assert.equal(stats.ninjutsuDefense, 0)
})
test('7. le Ninjutsu d’Orochimaru malade reste à 0 malgré un boost potentiel', () => {
  const boostedOrochimaru = { slug: 'orochimaru-malade', name: 'Orochimaru Malade (test boost)', stats: { ninjutsuAttack: 80, ninjutsuDefense: 80 } }
  const result = calculateCombat(build({ ninjutsu: boostedOrochimaru, 'kekkei-mora': 'hamura', chakra: card('C', { chakra: 80 }) }))
  assert.equal(result.finalStats.ninjutsuAttack, 0)
  assert.equal(result.finalStats.ninjutsuDefense, 0)
})

// 8-11. Naruto SJ / Konohamaru SJ annulent le boost Clan Ôtsutsuki
for (const [label, slug] of [['Naruto SJ', 'naruto-sj'], ['Konohamaru SJ', 'konohamaru-sj']] as const) {
  test(`8/10. ${label} en Ninjutsu + Ôtsutsuki en Clan annule le bonus de Clan`, () => {
    const result = calculateCombat(build({ clan: 'kaguya', ninjutsu: slug, chakra: card('C', { chakra: 80 }) }))
    assert.ok(!result.appliedRules.some((rule) => rule.ruleId === 'OTSUTSUKI_CLAN_BOOST'))
    assert.equal(result.finalStats.chakra, 80)
  })
  test(`9/11. ${label} en Body + Ôtsutsuki en Clan annule le bonus de Clan`, () => {
    const result = calculateCombat(build({ clan: 'kaguya', body: slug, chakra: card('C', { chakra: 80 }) }))
    assert.ok(!result.appliedRules.some((rule) => rule.ruleId === 'OTSUTSUKI_CLAN_BOOST'))
    assert.equal(result.finalStats.chakra, 80)
  })
}
test('sans Naruto SJ/Konohamaru SJ, le bonus de Clan Ôtsutsuki fonctionne toujours', () => {
  const result = calculateCombat(build({ clan: 'kaguya', chakra: card('C', { chakra: 80 }) }))
  assert.ok(result.appliedRules.some((rule) => rule.ruleId === 'OTSUTSUKI_CLAN_BOOST'))
  assert.equal(result.finalStats.chakra, 104)
})

// 12. Ôtsutsuki en Body => +30% Chakra et Vitesse
test('12. un Ôtsutsuki en Body applique +30% Chakra et Vitesse', () => {
  const result = calculateCombat(build({ body: 'hamura', chakra: card('C', { chakra: 80 }), vitesse: card('V', { speed: 80 }) }))
  const chakraRule = result.appliedRules.find((rule) => rule.ruleId === 'OTSUTSUKI_BODY_BOOST' && rule.target === 'chakra')
  const speedRule = result.appliedRules.find((rule) => rule.ruleId === 'OTSUTSUKI_BODY_BOOST' && rule.target === 'speed')
  assert.equal(chakraRule?.value, 0.3)
  assert.equal(speedRule?.value, 0.3)
})

// 13. Jûbidara en Body => +30% Chakra et Vitesse
test('13. Jûbidara en Body applique +30% Chakra et Vitesse', () => {
  const stats = calculateFinalStats(build({ body: 'juubidara', chakra: card('C', { chakra: 80 }), vitesse: card('V', { speed: 80 }) }))
  assert.equal(stats.chakra, 104)
  assert.equal(stats.speed, 104)
})

// 14. Jûbito en Body => +30% Chakra et Vitesse
test('14. Jûbito en Body applique +30% Chakra et Vitesse', () => {
  const stats = calculateFinalStats(build({ body: 'juubito', chakra: card('C', { chakra: 80 }), vitesse: card('V', { speed: 80 }) }))
  assert.equal(stats.chakra, 104)
  assert.equal(stats.speed, 104)
})

// 15. Aucun double boost involontaire pour Jûbidara/Jûbito en Body
test('15. Jûbidara en Body ne déclenche qu’une seule fois le bonus Chakra', () => {
  const result = calculateCombat(build({ body: 'juubidara', chakra: card('C', { chakra: 80 }) }))
  assert.equal(result.appliedRules.filter((rule) => rule.target === 'chakra').length, 1)
})

// 16-17. Itachi / Itachi Prime en Avatar => +50 points Kenjutsu
for (const slug of ['itachi', 'itachi-prime']) {
  test(`16/17. ${slug} en Avatar donne +50 points en Kenjutsu`, () => {
    const stats = calculateFinalStats(build({ avatar: slug, kenjutsu: card('K', { kenjutsu: 50 }) }))
    assert.equal(stats.kenjutsu, 100)
  })
}

// 18-19. Minato Kenjutsu + Tobirama Ninjutsu (non symétrique)
test('18. Minato en Kenjutsu + Tobirama en Ninjutsu donne +10% Ninjutsu à Tobirama', () => {
  const result = calculateCombat(build({ kenjutsu: 'minato', ninjutsu: 'tobirama' }))
  const rule = result.appliedRules.find((entry) => entry.ruleId === 'MINATO_KENJUTSU_TOBIRAMA_NINJUTSU_BOOST')
  assert.equal(rule?.value, 0.1)
})
test('19. Minato en Ninjutsu + Tobirama en Kenjutsu ne donne aucun bonus dédié', () => {
  const result = calculateCombat(build({ ninjutsu: 'minato', kenjutsu: 'tobirama' }))
  assert.ok(!result.appliedRules.some((entry) => entry.ruleId === 'MINATO_KENJUTSU_TOBIRAMA_NINJUTSU_BOOST'))
})

// 20-22. Kakashi DMS Avatar + Obito Ninjutsu
for (const obitoSlug of ['obito', 'obito-orange', 'obito-blanc']) {
  test(`20/22. Kakashi DMS en Avatar + ${obitoSlug} en Ninjutsu donne +10% Avatar`, () => {
    const result = calculateCombat(build({ avatar: 'kakashi-dms', ninjutsu: obitoSlug }))
    const rule = result.appliedRules.find((entry) => entry.ruleId === 'KAKASHI_DMS_AVATAR_OBITO_NINJUTSU_BOOST')
    assert.equal(rule?.value, 0.1)
  })
}
test('21. Kakashi (non-DMS) en Avatar + Obito en Ninjutsu ne donne aucun bonus', () => {
  const result = calculateCombat(build({ avatar: 'kakashi', ninjutsu: 'obito' }))
  assert.ok(!result.appliedRules.some((entry) => entry.ruleId === 'KAKASHI_DMS_AVATAR_OBITO_NINJUTSU_BOOST'))
})

// 23-25. Utilisateurs des Portes en Taijutsu => +5% IQ
for (const slug of ['rock-lee', 'guy', 'guy-8-portes']) {
  test(`23/25. ${slug} en Taijutsu donne +5% IQ`, () => {
    const stats = calculateFinalStats(build({ taijutsu: slug, iq: card('IQ', { iq: 80 }) }))
    assert.equal(stats.iq, 84)
  })
}

// 26-27. Jûgo en Body => +5% Senjutsu, ailleurs => rien
test('26. Jûgo en Body donne +5% Senjutsu', () => {
  const stats = calculateFinalStats(build({ body: 'jugo', senjutsu: card('S', { senjutsu: 80 }) }))
  assert.equal(stats.senjutsu, 84)
})
test('27. Jûgo hors Body ne donne aucun bonus de Senjutsu', () => {
  const stats = calculateFinalStats(build({ taijutsu: 'jugo', senjutsu: card('S', { senjutsu: 80 }) }))
  assert.equal(stats.senjutsu, 80)
})

// 28. Toutes les nouvelles règles sont chargées depuis classic.json
test('28. toutes les nouvelles règles sont bien chargées depuis classic.json', () => {
  const loadedIds = new Set(getCombatRules().map((rule) => rule.id))
  for (const id of NEW_RULE_IDS) assert.ok(loadedIds.has(id), `Règle manquante: ${id}`)
})

// 29. Aucune de ces règles ne modifie Team Auction / Team Combat
test('29. les nouvelles règles n’existent pas dans les données Team Auction', () => {
  const serialized = JSON.stringify(teamAuctionRulesJson)
  for (const id of NEW_RULE_IDS) assert.ok(!serialized.includes(id), `La règle ${id} ne doit pas apparaître dans team-auction.json`)
})

// Jūbi valide = chakra >= 70 et body >= 50 (mêmes conditions que JUBI_VALIDATED_BOOST)
// JUBI_VALIDATED_BOOST (règle existante, non modifiée) ajoute déjà +40 points quand le Jūbi est valide ; s'additionne au +75 ici testé.
test('Jūbi valide en Avatar + slot Kekkei Mōra vide donne +75 points', () => {
  const stats = calculateFinalStats(build({ avatar: 'juubidara', chakra: card('C', { chakra: 80 }), body: card('B', { body: 60 }) }))
  assert.equal(stats.kekkeiMora, 115)
})

test('Jūbi valide en Avatar + Kekkei Mōra déjà sélectionné ne donne aucun +75', () => {
  const stats = calculateFinalStats(build({ avatar: 'juubidara', chakra: card('C', { chakra: 80 }), body: card('B', { body: 60 }), 'kekkei-mora': card('Mora', { kekkeiMora: 10 }) }))
  assert.equal(stats.kekkeiMora, 50)
})

test('Jūbi invalide en Avatar ne donne aucun +75 même si le slot Kekkei Mōra est vide', () => {
  const stats = calculateFinalStats(build({ avatar: 'juubidara', chakra: card('C', { chakra: 40 }), body: card('B', { body: 60 }) }))
  assert.equal(stats.kekkeiMora, 0)
})

test('Jūbi absent du slot Avatar ne donne aucun bonus de 75 points', () => {
  const stats = calculateFinalStats(build({ body: 'juubidara', 'kekkei-mora': card('Mora', { kekkeiMora: 10 }) }))
  assert.equal(stats.kekkeiMora, 10)
})

test('le bonus Jūbi en Avatar est un bonus fixe de 75 points, pas un pourcentage', () => {
  const stats = calculateFinalStats(build({ avatar: 'juubito', chakra: card('C', { chakra: 80 }), body: card('B', { body: 60 }) }))
  assert.equal(stats.kekkeiMora, 115)
})

test('la règle Jūbi en Avatar est chargée depuis classic.json', () => {
  assert.ok(getCombatRules().some((rule) => rule.id === 'JUBI_AVATAR_KEKKEI_MORA_POINTS'))
})

test('Zetsu blanc en Body échange sa note avec un Body adverse strictement supérieur', () => {
  const result = simulateFight(
    build({ body: 'zetsu-blanc', avatar: card('Avatar J1') }),
    build({ body: card('Body adverse', { body: 80 }), avatar: card('Avatar J2') }),
  )
  assert.equal(result.player1.finalStats.body, 80)
  assert.equal(result.player2.finalStats.body, 27)
  assert.ok(result.player1.appliedRules.some((rule) => rule.ruleId === 'ZETSU_BLANC_BODY_SWAP' && rule.before === 27 && rule.after === 80))
  assert.ok(result.player2.appliedRules.some((rule) => rule.label === 'Zetsu blanc adverse' && rule.before === 80 && rule.after === 27))
})

test('Zetsu blanc en Body fonctionne quel que soit le joueur qui le possède', () => {
  const result = simulateFight(
    build({ body: card('Body adverse', { body: 80 }), avatar: card('Avatar J1') }),
    build({ body: 'zetsu-blanc', avatar: card('Avatar J2') }),
  )
  assert.equal(result.player1.finalStats.body, 27)
  assert.equal(result.player2.finalStats.body, 80)
})

for (const opponentBody of [27, 20]) {
  test(`Zetsu blanc ne fait aucun échange contre un Body adverse à ${opponentBody}`, () => {
    const result = simulateFight(
      build({ body: 'zetsu-blanc', avatar: card('Avatar J1') }),
      build({ body: card('Body adverse', { body: opponentBody }), avatar: card('Avatar J2') }),
    )
    assert.equal(result.player1.finalStats.body, 27)
    assert.equal(result.player2.finalStats.body, opponentBody)
    assert.ok(!result.player1.appliedRules.some((rule) => rule.ruleId === 'ZETSU_BLANC_BODY_SWAP'))
  })
}

test('le malus sans Avatar ne touche que le joueur concerné et ne s’applique qu’une fois', () => {
  const result = simulateFight(
    build({ chakra: card('Chakra J1', { chakra: 100 }) }),
    build({ chakra: card('Chakra J2', { chakra: 100 }), avatar: card('Avatar J2', { avatar: 50 }) }),
  )
  assert.equal(result.player1.total, 85)
  assert.equal(result.player2.total, 150)
  assert.equal(result.player1.appliedRules.filter((rule) => rule.ruleId === 'NO_AVATAR_FINAL_PENALTY').length, 1)
  assert.equal(result.player2.appliedRules.filter((rule) => rule.ruleId === 'NO_AVATAR_FINAL_PENALTY').length, 0)
})

test('deux joueurs sans Avatar reçoivent chacun exactement un malus de 15 %', () => {
  const result = simulateFight(
    build({ chakra: card('Chakra J1', { chakra: 100 }) }),
    build({ chakra: card('Chakra J2', { chakra: 200 }) }),
  )
  assert.equal(result.player1.total, 85)
  assert.equal(result.player2.total, 170)
  assert.equal(result.player1.appliedRules.filter((rule) => rule.ruleId === 'NO_AVATAR_FINAL_PENALTY').length, 1)
  assert.equal(result.player2.appliedRules.filter((rule) => rule.ruleId === 'NO_AVATAR_FINAL_PENALTY').length, 1)
})

// Uzumaki en Chakra + clan Uzumaki => pas de double boost Chakra
test('Uzumaki en Chakra + clan Uzumaki ne donne aucun boost Chakra supplémentaire', () => {
  const result = calculateCombat(build({ chakra: card('C', { chakra: 80 }, ['UZUMAKI']), clan: card('Clan', {}, ['UZUMAKI']) }))
  assert.equal(result.finalStats.chakra, 80)
  assert.ok(!result.appliedRules.some((rule) => rule.ruleId === 'UZUMAKI_CLAN_CHAKRA'))
})

// Ōtsutsuki en Chakra + clan Ōtsutsuki => aucun boost Chakra venant du clan
test('Ōtsutsuki en Chakra + clan Ōtsutsuki ne donne aucun boost Chakra venant du clan', () => {
  const result = calculateCombat(build({ chakra: card('C', { chakra: 80 }, ['OTSUTSUKI']), clan: card('Clan', {}, ['OTSUTSUKI']) }))
  assert.equal(result.finalStats.chakra, 80)
  assert.ok(!result.appliedRules.some((rule) => rule.ruleId === 'OTSUTSUKI_CLAN_CHAKRA_BOOST'))
})

// Ōtsutsuki en Chakra + un autre clan donnant du Chakra => toujours aucun boost Chakra venant du clan
test('Ōtsutsuki en Chakra + clan Uzumaki ne donne aucun boost Chakra venant du clan', () => {
  const result = calculateCombat(build({ chakra: card('C', { chakra: 80 }, ['OTSUTSUKI']), clan: card('Clan', {}, ['UZUMAKI']) }))
  assert.equal(result.finalStats.chakra, 80)
  assert.ok(!result.appliedRules.some((rule) => rule.ruleId === 'UZUMAKI_CLAN_CHAKRA'))
})

test('sans Ōtsutsuki/Uzumaki en Chakra, le bonus Chakra du clan Uzumaki fonctionne toujours', () => {
  const result = calculateCombat(build({ chakra: card('C', { chakra: 80 }), clan: card('Clan', {}, ['UZUMAKI']) }))
  assert.equal(result.finalStats.chakra, 100)
  assert.ok(result.appliedRules.some((rule) => rule.ruleId === 'UZUMAKI_CLAN_CHAKRA'))
})

// Capacité invalide (Sharingan en Genjutsu sans clan compatible) => aucun boost/nerf associé, effet forcé à 0
test('capacité Sharingan en Genjutsu sans clan compatible est invalide et son effet est neutralisé', () => {
  const stats = calculateFinalStats(build({ genjutsu: 'sasuke', clan: card('Clan', {}, ['SENJU']) }))
  assert.equal(stats.genjutsu, 0)
})
test('capacité Sharingan en Genjutsu avec clan Uchiwa reste valide et fonctionne normalement', () => {
  const stats = calculateFinalStats(build({ genjutsu: 'sasuke', clan: card('Clan', {}, ['UCHIWA']) }))
  assert.equal(stats.genjutsu, 61)
})
