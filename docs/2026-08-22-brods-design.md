# BRODS — Documento de Design

**Criador e líder:** Lucca (9 anos). **Apoio:** pai. **Construção:** Claude.
**Data do planejamento:** 22/08/2026.

## 1. O que é
Jogo de mistério estilo Among Us, **um jogador contra o computador**, numa **mansão assombrada**.
Um único arquivo HTML (canvas + JS), publicável por link. Funciona em **computador (teclado)** e **celular/tablet (joystick na tela)** — detecta o aparelho.

## 2. Personagens (desenhos do Lucca, em `assets/`)
| Papel | Cor | Lema |
|---|---|---|
| VENUS | várias cores | "Execute as missões e expulse os assassinos" |
| DEMOM | vermelho | "Mate e sabote para vencer" |
| CHEFE / COZINHEIRO | roxo | "Engula todos e sobreviva" |

Três times independentes. O papel do jogador é **sorteado** no início ("Você é… VENUS / DEMOM / CHEFE!").

## 3. Partida
- **4 a 16 personagens**, escolhido na tela inicial. Sempre 1 DEMOM e 1 CHEFE (em partidas ≥ 10, opção de 2 DEMOM no painel de ajustes). O resto é VENUS.
- **Painel de ajustes** (estilo opções do Among Us): velocidade, nº de missões para vencer, tempo de digestão, pegadas do DEMOM on/off, VENUS do computador confiam no jogador ou não, tempo de discussão e votação, nº de sabotagens, etc.

## 4. Vitórias
- **VENUS:** todas as missões concluídas **ou** DEMOM e CHEFE expulsos/mortos.
- **DEMOM:** nº de VENUS vivos ≤ nº de DEMOM vivos, **ou** sabotagem de emergência não resolvida.
- **CHEFE:** último em pé (todos os outros mortos, digeridos ou na barriga).

## 5. Morte, fantasmas e engolir
- Morto pelo DEMOM: **corpo fica no chão** (reportável) e a alma vira **fantasma** que só observa — não fala, não convoca reunião, não vota, não sabota, não faz missão.
- Engolido pelo CHEFE: vai para a barriga por **60 s** (ajustável). Se nesse tempo o CHEFE for **expulso na votação** ou **morto pelo DEMOM**, **todos da barriga saem vivos**. Senão, é **digerido**: morre e vira fantasma.
- O CHEFE pode engolir **qualquer um, inclusive o DEMOM** (mesma regra dos 60 s; DEMOM some do jogo enquanto está na barriga).
- O CHEFE não fica lento nem visivelmente maior (regra descartada — escolhidas as opções 2 e 4).

## 6. A mansão (vista de cima, 12 cômodos)
Salão de Entrada (botão de emergência) · Biblioteca · Cozinha · Sala de Jantar · Porão (caixa de força + Jaula) · Sótão · Jardim · Capela · Quarto Principal · Laboratório · Galeria de Quadros · Torre.

**Passagens secretas** (só DEMOM e CHEFE veem e usam, teletransporte): Biblioteca ↔ Porão · Cozinha ↔ Sótão.

### Cômodos especiais (risco × recompensa)
| Cômodo | Item | Recompensa | Risco |
|---|---|---|---|
| Cozinha | **Livro dos Mortos** | Mostra foto de cada morto (aparência de morto, sangue). Quem olha ganha: **entrevistar o morto por 60 s** (o que havia no local quando morreu), ver **quantas tarefas ele concluiu** e **onde ele esteve** (saber se aquele lugar é perigoso). | Território do CHEFE: se ele estiver lá, engole. |
| Galeria de Quadros | **Olhos dos quadros** | Mostra por onde cada personagem passou na última rodada. | **Um quadro mente** (o jogador não sabe qual). |
| Laboratório | **Poção de Escudo** | Protege de 1 ataque (DEMOM ou CHEFE). 1 dose por partida. | Boca roxa: os outros desconfiam. |
| Capela | **Altar da Segunda Chance** | 1× por partida um VENUS revive 1 morto (sem memória de quem o matou). | O sino avisa a mansão inteira onde você está. |
| Porão | **Jaula** | O expulso vai para a Jaula em vez de sumir. Se os VENUS perceberem o erro, podem soltá-lo com uma missão no Porão. | Escuro: só se vê quem está ao lado. Lugar favorito do DEMOM. |

## 7. Missões dos VENUS
**Minijogos rápidos (~10 s), um por cômodo.** Exemplos: ordenar livros (Biblioteca), ligar os fios do portão (Jardim), misturar as cores da poção (Laboratório), girar o telescópio até a lua (Torre), acender velas na sequência (Capela), arrumar a mesa (Sala de Jantar), fechar a janela do vento (Quarto), endireitar quadros (Galeria), religar a caixa de força (Porão), abrir o baú com senha (Sótão), mexer o caldeirão no ritmo (Cozinha), limpar a escada (Salão).
Enquanto faz a missão, o jogador não vê quem chega por trás.

## 8. Sabotagens do DEMOM
1. **Apagar as luzes** — VENUS só enxergam um círculo ao redor (modo sombrio com lanterna); DEMOM enxerga normal. Conserto: religar chaves na caixa de força do Porão.
2. **Trancar portas** — portas de um cômodo trancadas por 10 s.
3. **Soltar os fantasmas (emergência)** — alarme; 2 VENUS juntos na Capela tocam o sino em 30 s, senão o DEMOM vence.
4. **Bagunçar missões** — desfaz uma missão já concluída; os VENUS têm de refazer.

## 9. Reunião e votação
Gatilho: corpo reportado ou botão de emergência no Salão. Todos os vivos se reúnem.
- Personagens do computador falam em **balões** (VENUS dizem a verdade do que viram; DEMOM e CHEFE podem mentir e às vezes se contradizem).
- O jogador **digita livremente**; os personagens reagem a **palavras-chave** (cores/nomes, cômodos, "vi", "corpo", "acuso", "sozinho"...).
- Votação (pode pular). Maioria → expulso vai para a **Jaula do Porão**. Se expulsar o CHEFE, a barriga abre.

## 10. Visual
- **Cartoon colorido** estilo Among Us: personagens arredondados, mansão roxa/azul-escuro, lua, teias, contorno grosso. Assustador mas engraçado.
- **Modo sombrio com lanterna** quando as luzes são apagadas.
- Personagens: desenhos do Lucca (VENUS em várias cores, DEMOM vermelho, CHEFE roxo).
- Tela inicial com o título **BRODS** bem grande.

## 11. Som
Música de fundo misteriosa (órgão, vento, corujas) gerada no próprio jogo (WebAudio, sem arquivos externos), que **muda com o clima**: calma → acelera na sabotagem → tambor na votação → mais grave quando o jogador é DEMOM. Efeitos: passos, porta rangendo, "blup" do engolir, alarme, sino, susto do corpo, tambor da votação. Botão de som on/off.

## 12. Medalhas e conquistas
Tela de medalhas salva no aparelho (localStorage). Exemplos: "Detetive de Primeira" (acertou o DEMOM na 1ª votação), "Barriga Cheia" (engoliu 5 numa partida), "Sobrevivente" (último VENUS vivo), "Mentiroso Profissional" (venceu como DEMOM sem receber voto), "Leitor dos Mortos" (usou o Livro dos Mortos 3×), "Escudo na Hora Certa" (Poção salvou de um ataque).

## 13. Controles
- **Computador:** setas/WASD andar · E usar/missão · R reportar · Q matar/engolir · Espaço sabotar (DEMOM) / passagem secreta · Enter digitar na reunião.
- **Celular:** joystick virtual à esquerda; botões grandes à direita (Usar, Reportar, Matar/Engolir, Sabotar); teclado do aparelho na reunião.

## 14. Plano de construção (fatias, cada uma jogável)
1. **Fatia 1** — mansão de 12 cômodos, personagem andando (teclado + joystick), câmera, colisão, minijogos das missões, HUD básico.
2. **Fatia 2** — personagens do computador (andam entre cômodos, fazem missões), sorteio de papéis, matar/engolir/digestão, corpos e fantasmas, reunião com conversa digitada e votação, condições de vitória, telas de início/fim.
3. **Fatia 3** — sabotagens, passagens secretas, cômodos especiais (Livro dos Mortos, Galeria, Poção, Altar, Jaula).
4. **Fatia 4** — visual final com os desenhos do Lucca, modo sombrio/lanterna, música adaptativa e efeitos, painel de ajustes, medalhas, polimento e publicação.

## 15. Multijogador (adicionado em 23/08/2026)
Sala por código (4 letras). Servidor relay na Cloudflare (Worker + Durable Object, pasta `server/`, `npx wrangler deploy` → https://brods-server.boito.workers.dev). O dono da sala roda o jogo; convidados enviam comandos e recebem a cena (12 snapshots/s). Reunião, chat e votação em rede. Quem sai vira bot.

## 16. Fora do escopo (por agora)
Dois jogadores no mesmo aparelho · salvar partida no meio · reconexão automática.
