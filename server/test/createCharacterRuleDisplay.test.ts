import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { appliedRuleSentence, appliedRuleTone } from '../../client/src/services/combatRuleDisplay.js'

const partieSource = readFileSync(new URL('../../client/src/views/Partie.vue', import.meta.url), 'utf8')
const simulationSource = readFileSync(new URL('../../client/src/views/Simulation.vue', import.meta.url), 'utf8')

test('les traces Zetsu sont formulées séparément pour le propriétaire et son adversaire', () => {
  const owner = { ruleId: 'ZETSU_BLANC_BODY_SWAP', label: 'Zetsu blanc en Body', target: 'body', operation: 'set', value: 80, before: 27, after: 80 }
  const opponent = { ruleId: 'ZETSU_BLANC_BODY_SWAP', label: 'Zetsu blanc adverse', target: 'body', operation: 'set', value: 27, before: 80, after: 27 }
  assert.equal(appliedRuleSentence(owner), 'Zetsu blanc en Body — Échange Body : 27 → 80')
  assert.equal(appliedRuleSentence(opponent), 'Zetsu blanc adverse — Échange Body : 80 → 27')
  assert.equal(appliedRuleTone(owner), 'bonus')
  assert.equal(appliedRuleTone(opponent), 'malus')
})

test('la trace Aucun Avatar valide affiche explicitement le malus final de 15 %', () => {
  const rule = { ruleId: 'NO_AVATAR_FINAL_PENALTY', label: 'Aucun Avatar valide', target: 'total', operation: 'percentage', value: -0.15, before: 1, after: 0.85 }
  assert.equal(appliedRuleSentence(rule), 'Aucun Avatar valide : -15 % sur la note finale')
  assert.equal(appliedRuleTone(rule), 'malus')
})

test('Simulation affiche les bonus et malus sous chaque joueur sans liste globale mélangée', () => {
  assert.match(simulationSource, /BONUS \/ MALUS JOUEUR 1/)
  assert.match(simulationSource, /BONUS \/ MALUS JOUEUR 2/)
  assert.match(simulationSource, /result\.player1\.appliedRules/)
  assert.match(simulationSource, /result\.player2\.appliedRules/)
  assert.doesNotMatch(simulationSource, /\.\.\.result\.player1\.appliedRules/)
})

test('Partie affiche les règles dans le panneau du joueur local et du joueur temps réel', () => {
  assert.match(partieSource, /BONUS \/ MALUS JOUEUR \{\{ index \+ 1 \}\}/)
  assert.match(partieSource, /autoRealtimeResult\.players\[ranking\.playerIndex\]\?\.appliedRules/)
  assert.doesNotMatch(partieSource, /players\.flatMap\(\(player\) => player\.appliedRules\)/)
})
