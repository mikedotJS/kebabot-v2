# 🦑 Manuel Kebabot - Call of Cthulhu 7ème Édition

## Table des Matières

1. [Introduction](#introduction)
2. [Installation et Configuration](#installation-et-configuration)
3. [Commandes de Base](#commandes-de-base)
4. [Création de Personnage](#création-de-personnage)
5. [Système de Dés](#système-de-dés)
6. [Gestion des Personnages](#gestion-des-personnages)
7. [Système de Folie](#système-de-folie)
8. [Guide du MJ](#guide-du-mj)
9. [Exemples de Parties](#exemples-de-parties)
10. [Dépannage](#dépannage)

---

## Introduction

Kebabot est un assistant Discord spécialement conçu pour **Call of Cthulhu 7ème Édition**. Il gère automatiquement la création de personnages, les jets de dés, le suivi de la folie et bien plus encore.

### Fonctionnalités Principales
- ✅ Création de personnages conforme aux règles officielles
- ✅ Système de dés complet (dés standards + CoC)
- ✅ Suivi automatique de la folie et des conditions
- ✅ Gestion des compétences et caractéristiques
- ✅ Interface intuitive avec modales Discord
- ✅ Base de données persistante

---

## Installation et Configuration

### Pour les Joueurs
1. Invitez Kebabot sur votre serveur Discord
2. Utilisez `/character create` pour créer votre premier personnage
3. Commencez à jouer !

### Pour les MJs
1. Configurez les permissions du bot
2. Créez des canaux dédiés (général, rp, ooc)
3. Familiarisez-vous avec les commandes de gestion

---

## Commandes de Base

### 🎲 Jets de Dés

#### Dés Standards
```
/roll 1d20+5              # Dé à 20 faces avec bonus
/roll 3d6                 # Trois dés à 6 faces
/roll 4d6 drop lowest     # Quatre dés à 6, garde les 3 meilleurs
/roll 1d20 advantage      # Jet avec avantage (D&D)
/d100                     # Dé percentile simple
```

#### Jets Call of Cthulhu
```
/coc spot hidden          # Test de compétence (utilise votre valeur)
/coc psychologie hard     # Test difficile (-20%)
/luck                     # Test de chance (dépense 1 point)
/sanity major             # Test de folie avec perte automatique
```

### 👤 Gestion de Personnage
```
/character create         # Créer un nouveau personnage
/character show           # Afficher la fiche complète
/character set            # Modifier une compétence
/character backstory      # Éditer l'histoire du personnage
```

---

## Création de Personnage

### Étape 1 : Informations de Base
```
/character create name:Jean_Dupont occupation:Detective age:32 method:roll
```

**Paramètres :**
- `name` : Nom du personnage
- `occupation` : Profession (ex: "Détective", "Médecin", "Journaliste")
- `age` : Âge (15-90 ans)
- `method` : Méthode de génération
  - `roll` : 3d6×5 pour chaque caractéristique (recommandé)
  - `pointbuy` : Répartition de 460 points
  - `manual` : Valeurs par défaut (à modifier ensuite)

### Étape 2 : Caractéristiques Générées

Le bot calcule automatiquement :
- **Caractéristiques** : STR, DEX, INT, CON, APP, POW, SIZ, EDU
- **Attributs dérivés** : PV, Folie, Chance, Points de Magie
- **Combat** : Mouvement, Bonus de Dégâts, Constitution
- **Compétences** : 40+ compétences avec valeurs par défaut

### Étape 3 : Personnalisation

#### Modifier les Compétences
```
/character set skill:"spot hidden" value:75
/character set skill:"psychologie" value:60
```

#### Ajouter l'Histoire du Personnage
```
/character backstory
```
Ouvre une modale avec 5 champs :
- **Description Personnelle** : Apparence, manières
- **Idéologie & Croyances** : Ce qui motive le personnage
- **Personnes Importantes** : Relations significatives
- **Lieux Significatifs** : Endroits qui comptent
- **Objets Précieux** : Possessions chères

---

## Système de Dés

### Jets de Compétence CoC

#### Niveaux de Réussite
- **Réussite Extrême** : ≤ 1/5 de la compétence (🌟)
- **Réussite Difficile** : ≤ 1/2 de la compétence (✨)
- **Réussite Normale** : ≤ compétence (✅)
- **Échec** : > compétence (❌)
- **Fumble** : 96+ sur un échec (💀)

#### Exemples
```
/coc spot hidden          # Test normal
/coc psychologie hard     # Test difficile (÷2)
/coc occult extreme       # Test extrême (÷5)
```

### Système de Chance

```
/luck                     # Test de chance (dépense 1 point sur succès)
/luck spend:false         # Test sans dépenser de chance
```

**Règles :**
- Utilise la valeur actuelle de Chance
- Dépense automatiquement 1 point sur succès
- Aucune chance = impossible de faire le test

---

## Gestion des Personnages

### Affichage de la Fiche
```
/character show
```

**Affiche :**
- Caractéristiques et attributs dérivés
- Compétences principales
- Langues parlées
- Équipement et armes
- État de l'histoire personnelle
- Conditions actuelles

### Modification des Compétences

#### Compétences Standard
```
/character set skill:"spot hidden" value:80
/character set skill:"psychologie" value:45
/character set skill:"bibliothèque" value:70
```

#### Compétences Personnalisées
```
/character set skill:"conduite moto" value:30
/character set skill:"langue russe" value:25
```

### Gestion de l'Équipement

L'équipement peut être ajouté via l'interface de backstory ou directement en base de données par le MJ.

---

## Système de Folie

### Tests de Folie
```
/sanity minor             # Perte : 0/1d4
/sanity moderate          # Perte : 1d2/1d6
/sanity major             # Perte : 1d4/1d8
/sanity severe            # Perte : 1d6/1d10
/sanity extreme           # Perte : 1d10/1d20
```

### Calcul Automatique
- **Succès** : Perte réduite
- **Échec** : Perte complète
- **Succès Extrême** : Aucune perte (selon les règles)

### Conditions de Folie

#### Folie Temporaire
- **Déclencheur** : Perte de 5+ points de folie en un test
- **Effet** : Ajout automatique de la condition
- **Durée** : 1d10 heures

#### Folie Indéfinie
- **Déclencheur** : Folie ≤ 1/5 de la folie de départ
- **Effet** : Condition permanente
- **Récupération** : Thérapie ou temps

### Exemple de Test
```
/sanity major description:"Rencontre avec un Shoggoth"
```

**Résultat possible :**
```
🧠 Jean Dupont - Test de Folie
*Rencontre avec un Shoggoth*

Folie Actuelle: 65 | Jeté: 23
Sévérité: Major

✅ SUCCÈS!

💔 Folie Perdue: 1d4 (2) = 2 points
🧠 Nouvelle Folie: 63/99
```

---

## Guide du MJ

### Configuration du Serveur

#### Canaux Recommandés
- `#général` : Discussions OOC
- `#rôleplay` : Actions des personnages
- `#ooc` : Questions et clarifications
- `#journal` : Notes de partie

#### Permissions du Bot
- Lire les messages
- Envoyer des messages
- Utiliser les commandes slash
- Gérer les embeds

### Gestion des Personnages

#### Création Assistée
1. Guidez les joueurs pour `/character create`
2. Vérifiez les compétences de profession
3. Ajustez si nécessaire avec `/character set`

#### Modifications MJ
```javascript
// Exemple de modification directe en base
db.coc_characters.updateOne(
  { userId: "123456789" },
  { $set: { "skills.cthulhu mythos": 5 } }
)
```

### Gestion des Tests

#### Tests de Compétence
- Laissez les joueurs utiliser `/coc [compétence]`
- Intervenez pour les difficultés spéciales
- Utilisez les modificateurs de difficulté

#### Tests de Folie
- Utilisez `/sanity [sévérité]` pour les événements
- Ajoutez des descriptions pour l'immersion
- Surveillez les conditions de folie

### Outils MJ Avancés

#### Suivi des Conditions
Le bot suit automatiquement :
- Folie temporaire/indéfinie
- Blessures
- Phobies et manies
- Conditions spéciales

#### Gestion des Équipements
- Armes avec dégâts et portée
- Armures et protection
- Objets magiques
- Livres et tomes

---

## Exemples de Parties

### Scénario : "L'Appel de Cthulhu"

#### Préparation
1. **Création des personnages** (30 min)
   ```
   /character create name:Inspector_Legrasse occupation:Detective age:45
   /character create name:Dr_Thurston occupation:Anthropologue age:38
   ```

2. **Configuration initiale**
   - Ajustement des compétences de profession
   - Ajout d'équipement de base
   - Écriture des histoires personnelles

#### Déroulement de la Partie

**Scène 1 : L'Enquête**
```
Joueur: /coc spot hidden
Bot: ✅ SUCCÈS! Vous trouvez des traces de boue étrange.

MJ: /sanity minor description:"Découverte d'un cadavre mutilé"
Bot: ❌ ÉCHEC! Perte de 1d4 (3) points de folie.
```

**Scène 2 : La Confrontation**
```
Joueur: /coc occult
Bot: ✨ RÉUSSITE DIFFICILE! Vous reconnaissez le symbole.

MJ: /sanity extreme description:"Vision de Cthulhu"
Bot: 💀 FUMBLE! Perte de 1d20 (18) points de folie.
Bot: ⚠️ FOLIE TEMPORAIRE! (Perte de 18 points en un test)
```

### Conseils pour les MJs

#### Rythme de la Partie
- Utilisez les tests de folie avec parcimonie
- Variez les difficultés des tests
- Encouragez l'utilisation de la chance

#### Immersion
- Ajoutez des descriptions aux tests de folie
- Utilisez les histoires personnelles des joueurs
- Intégrez les conditions de folie dans le récit

---

## Dépannage

### Problèmes Courants

#### "Vous n'avez pas encore de personnage"
**Solution :** Utilisez `/character create` pour en créer un.

#### "Compétence non trouvée"
**Solutions :**
- Vérifiez l'orthographe
- Utilisez des variantes (ex: "spot" pour "spot hidden")
- Ajoutez la compétence avec `/character set`

#### "Erreur de dés"
**Solutions :**
- Vérifiez la syntaxe (ex: `1d20+5`, pas `1d20 + 5`)
- Utilisez des notations simples
- Consultez les exemples ci-dessus

### Commandes de Diagnostic

#### Vérification du Personnage
```
/character show
```
Affiche toutes les informations du personnage.

#### Test de Connexion
```
/ping
```
Vérifie que le bot fonctionne.

### Support

#### Logs d'Erreur
En cas de problème, vérifiez :
1. Les permissions du bot
2. La syntaxe des commandes
3. L'existence du personnage

#### Contact
Pour les bugs ou suggestions, contactez l'administrateur du serveur.

---

## Annexes

### A. Liste des Compétences CoC

#### Compétences d'Investigation
- Accounting (Comptabilité)
- Anthropology (Anthropologie)
- Appraise (Évaluation)
- Archaeology (Archéologie)
- Art/Craft (Art/Artisanat)
- Charm (Charme)
- Climb (Escalade)
- Credit Rating (Cote de Crédit)
- Cthulhu Mythos (Mythe de Cthulhu)
- Disguise (Déguisement)
- Dodge (Esquive)
- Drive Auto (Conduite)
- Electrical Repair (Réparation Électrique)
- Fast Talk (Baratin)
- Fighting (Brawl) (Combat à Mains Nues)
- Firearms (Handgun) (Armes à Feu - Pistolet)
- Firearms (Rifle/Shotgun) (Armes à Feu - Fusil)
- First Aid (Premiers Secours)
- History (Histoire)
- Intimidate (Intimidation)
- Jump (Saut)
- Language (Other) (Langue Étrangère)
- Language (Own) (Langue Maternelle)
- Law (Droit)
- Library Use (Bibliothèque)
- Listen (Écoute)
- Locksmith (Serrurerie)
- Mechanical Repair (Réparation Mécanique)
- Medicine (Médecine)
- Natural World (Monde Naturel)
- Navigate (Navigation)
- Occult (Occultisme)
- Operate Heavy Machinery (Machines Lourdes)
- Persuade (Persuasion)
- Pilot (Pilotage)
- Psychology (Psychologie)
- Psychoanalysis (Psychanalyse)
- Ride (Équitation)
- Science (Science)
- Sleight of Hand (Escamotage)
- Spot Hidden (Observation)
- Stealth (Discrétion)
- Survival (Survie)
- Swim (Natation)
- Throw (Lancer)
- Track (Pistage)

### B. Table des Bonus de Dégâts

| STR + SIZ | Bonus de Dégâts | Constitution |
|-----------|-----------------|--------------|
| 2-64      | -2              | -2           |
| 65-84     | -1              | -1           |
| 85-124    | 0               | 0            |
| 125-164   | +1d4            | +1           |
| 165-204   | +1d6            | +2           |
| 205-284   | +2d6            | +3           |
| 285-364   | +3d6            | +4           |
| 365-444   | +4d6            | +5           |

### C. Table de Mouvement

| Condition | Mouvement |
|-----------|-----------|
| STR < SIZ et DEX < SIZ | 7 |
| STR ≥ SIZ ou DEX ≥ SIZ | 8 |
| STR > SIZ et DEX > SIZ | 9 |

---

**Kebabot v2.0 - Assistant Call of Cthulhu 7ème Édition**
*Développé avec ❤️ pour la communauté francophone*

---

*Ce manuel est fourni à titre informatif. Les règles officielles de Call of Cthulhu 7ème Édition restent la référence ultime.*
