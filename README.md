# COMPUTAÇÃO GRÁFICA – 2024.3
#### Prof. Rodrigo L. S. Silva

# Voxel-based environments

## [T1] 30 pontos
Este trabalho consiste na criação de um protótipo de modelagem baseado em voxels (voxel-based modelling). Esse tipo de modelagem é muito utilizada em jogos baseados em voxels, sendo Minecraft o mais famoso exemplo. Nesta primeira etapa o foco será no desenvolvimento dos elementos básicos deste protótipo, incluindo a possibilidade de adicionar e remover voxels, carregar e salvar um grupo de voxels em arquivo etc.

#### Ambiente de modelagem
_Tipos de voxels_
Neste trabalho teremos um total de 5 tipos de voxels, cada um com uma cor diferente. As duas cores básicas podem ser vistas [neste mapa](./map.png) (voxels que compõem a camada N1 e N2 no mapa). As outras três cores serão utilizadas nas árvores que comporão o ambiente (exemplos [aqui](./voxel-trees.png)) onde forma e cores serão definidas pelos grupos.

_Ambiente de modelagem_
Os objetos que serão inseridos no ambiente de execução serão criados em um ambiente à parte chamado “Ambiente de modelagem” ou Builder. Esse ambiente será composto por um plano base 10 x 10, onde cada célula do plano será visível, e os voxels deverão ser inseridos através das instruções da tabela ao lado.
Voxels adicionados podem ser removidos. Pesquise a função [scene.remove](https://threejs.org/docs/?q=scene#api/en/core/Object3D.remove) (object) para ver como isso é feito. A sugestão é remover o voxel através da sua posição, mas outras alternativas podem ser exploradas.
O local onde o objeto será adicionado no ambiente deve ser indicado com um cubo em modo wireframe, e deve-se criar uma forma de visualizar em qual altura aquele cubo está em relação ao plano base. O grupo deve definir como será essa visualização.
Ao menos três tipos de árvores baseadas em voxels devem ser criadas.

Para o ambiente de modelagem crie os arquivos _builder.js_ e _builder.html_.
<table>
  <tr>
    <th>Ação</th>
    <th>Teclas</th>
  </tr>
  <tr>
    <td>Movimentação no plano XZ</td>
    <td>Setas direcionais do teclado</td>
  </tr>
  <tr>
    <td>Movimentação em Y</td>
    <td>PgUp e PgDown</td>
  </tr>
  <tr>
    <td>Inserir voxel</td>
    <td>'Q'</td>
  </tr>
  <tr>
    <td>Remover voxel</td>
    <td>'E'</td>
  </tr>
  <tr>
    <td>Próximo tipo de voxel</td>
    <td>'.'</td>
  </tr>
  <tr>
    <td>Tipo anterior de voxel</td>
    <td>','</td>
  </tr>
</table>

_Gravação/carregamento de objetos modelados_
Ainda no ambiente de modelagem deve ser possível salvar os objetos criados em arquivo e posteriormente carregá-los.
Ambas as opções devem ser feitas através da interface [GUI](https://github.com/dataarts/dat.gui) (tem vários exemplos de uso dessa interface em nosso repositório e vocês já utilizaram em alguns exercícios). Além dos botões de salvar e carregar, deve-se passar como parâmetro o nome do arquivo a ser salvo ou o nome do arquivo a ser carregado dependendo do caso (esse [link](https://codepen.io/justgooddesign/pen/ngKJQx) pode ser útil).
A forma de salvar/carregar arquivos deve ser simples, sem bibliotecas e/ou frameworks adicionais (node por exemplo).
Pode-se usar, por exemplo, BLOB para salvar arquivos e FETCH para carregar.

#### Ambiente de execução
No ambiente de execução teremos um mapa baseado em voxels (exemplo meramente ilustrado na Figura 1 ao lado). O ambiente a ser criado no T1 deve ser semelhante ao ilustrado neste mapa. No mapa a área N0 tem altura 0 (é o plano base), N1 tem altura 1 e N2 tem altura 2. A forma como os voxels que comporão os níveis N1 e N2 serão inseridos no ambiente ficarão a critério do grupo.
Nas indicações marcadas pela letra “T” serão inseridas as árvores criadas no ambiente de modelagem. Como três modelos de árvores devem ser criados, dois objetos de cada modelo devem ser inseridos no ambiente de execução.
Aprimoramentos visuais serão incluídos nos próximos trabalhos.

_Controle de câmera_
Utilizaremos neste trabalho dois tipos de câmera: uma câmera de inspeção (_orbitControls_) e uma câmera em primeira pessoa (_first person camera_). Em nosso repositório, utilize o projeto _exampleFirstPerson_ como base para a implementação desta segunda câmera. As câmeras serão alternadas pressionando a tecla ‘C’ do teclado. Deve-se armazenar a posição anterior de cada câmera ao alternar entre os modos para que, ao voltar para a câmera anterior, a posição seja a mesma.

#### Outros
Para esta versão, utilize como material dos blocos o comando setDefaultMaterial, passando as cores como parâmetro.
Para iluminar o ambiente, utilize o comando _initDefaultBasicLight(scene)_. Essas duas funções foram utilizadas em nosso primeiro exemplo (_basicScene.js_). O sistema definitivo de iluminação do projeto será definido em detalhes nos próximos trabalhos.

---

## [T2] 35 pontos
Dando continuidade ao trabalho anterior, nesta etapa expandiremos nosso ambiente baseado em voxels com modelagem procedural e câmera em terceira pessoa.

#### Geração Procedural
Nesta etapa o ambiente será criado por [geração procedural](https://en.wikipedia.org/wiki/Procedural_generation). Existem vários algoritmos que podem ser utilizados para este fim como ilustrado [neste link](https://icecreamyou.github.io/THREE.Terrain/). Contudo, diferente do que é demonstrado no link, seguiremos com a construção do ambiente através de voxels. A altura máxima das estruturas que compõem o ambiente será de 20 unidades. Observe na imagem abaixo um exemplo de ambiente gerado com este tipo de técnica. As cores do ambiente gerado podem utilizar essa imagem como base. O grupo deve pesquisar por algoritmos clássicos ou empregar [uma função de ruído apropriada](https://www.redblobgames.com/maps/terrain-from-noise/) para gerar o ambiente.

O ambiente deve ser suficientemente amplo para que seja possível andar por um certo tempo sem chegar à sua borda. Para evitar problemas de desempenho, empregaremos um sistema de névoa ([fog](https://threejs.org/docs/#api/en/scenes/Fog)) para que apenas uma parte do ambiente seja visível. Um slider para aumentar/diminuir a distância do efeito de fog deve ser incluído (como [neste exemplo](https://rodrigoluis.github.io/CG/examples/exampleFog.html)). No valor máximo, deve ser possível ver todo o ambiente. Deve ser incluído também um contador de FPS (frames per second) na interface do ambiente (exemplo [aqui](https://rodrigoluis.github.io/CG/examples/shadowUpdate.html)).
As árvores criadas no T1 devem ser inseridas aleatoriamente no ambiente gerado, levando-se em consideração a altura do bloco onde cada árvore será inserida. Informações sobre os materiais a serem utilizados no terreno e árvores serão detalhadas mais adiante. Deve-se incluir no mínimo 20 árvores.

#### Personagem em terceira pessoa
Neste trabalho utilizaremos um dos personagens do Minecraft em uma visão em terceira pessoa (caso alguém não esteja familiarizado com esse tipo de visão, veja exemplos [aqui](https://www.google.com/search?sca_esv=970bf9b28f8ad5fb&sxsrf=ADLYWIIb2jQtDU9ZPNH39HBwXRZ7YZlZjg:1736527570958&q=third+view+game&udm=2&fbs=AEQNm0AuaLfhdrtx2b9ODfK0pnmi046uB92frSWoVskpBryHTtShVNbk-60xlcGTvYzJ-DKkEMNxV-kfsznyyrX_HVTEuQyuhpxLyGxvYSFMM1QTl2y-iY9-vxtGRTJO7DrlsXhWm_Z8xNw3Ui427IToVPMsbatySSIm8jjjW0ZXW-rN9LjWjV3mMD_yR67JU8UHx6Oa0ohNbMvUOJdQAwVYduuMm65zYA&sa=X&ved=2ahUKEwjQyImozeuKAxW6KLkGHV-iAbkQtKgLegQIGhAB&biw=1996&bih=959&dpr=1)). Os grupos poderão baixar assets para este fim ou utilizar [este modelo](https://www.dropbox.com/scl/fi/sejfx1lzbo5gacq6krhbo/steve.glb?rlkey=dhngg0jrsvsh2ex4atdll4ozv&e=1&st=980pdx1o&dl=0).
Os movimentos a serem implementados serão os de andar e pular. Importante ressalvar que o modelo disponibilizado tem animação de andar embutida. Se o grupo optar por baixar seu próprio modelo, o mesmo deve ter no mínimo esse tipo de animação.
Em relação à jogabilidade e interação, a movimentação será semelhante a do primeiro trabalho, com rotação da câmera feita através do mouse e movimentação via teclado. Deve-se mapear tanto as teclas WASD quanto as setas do teclado para fazer a movimentação. Para pular, deve-se mapear a tecla espaço e o botão direito do mouse (ambos devem funcionar). Na rotação, a orientação em Y pode ser a convencional ou a invertida. Para modificar entre os dois modos, deve-se pressionar a tecla 'Y'.
Novamente teremos uma câmera de inspeção e uma câmera em terceira pessoa, sendo alternadas ao pressionar a tecla 'C'.

#### Colisão
Para interagir com o ambiente um sistema de colisão deve ser implementado. A ideia básica por trás de um sistema de colisão em threejs pode ser analisada por este exemplo, mas considerando a natureza do sistema proposto, é possível implementar sistemas ad hoc mais eficientes.
Essencialmente o personagem deve colidir com todos os blocos do ambiente, podendo subir nos níveis mais altos do terreno através de saltos. Ao descer de um bloco, o personagem deve deslocar para o primeiro bloco abaixo. Toda a movimentação deve ser suave, conforme ocorre em qualquer jogo semelhante ao que está sendo implementado. Deve ser possível, por exemplo, pular de um bloco mais alto e cair em um bloco mais baixo. O sistema de colisão deve impedir que o personagem atravesse um bloco. Neste caso, ao colidir com um bloco sem pular, o personagem deve deslizar pelo bloco, mantendo a animação de movimento.

#### Iluminação e materiais
Para este trabalho teremos uma luz direcional principal que projetará sombra no ambiente. Para uma melhor qualidade visual, deve-se utilizar uma luz ambiente ou criar uma segunda luz direcional de menor intensidade posicionada na direção oposta à principal, que não projetará sombras, para melhor iluminar o ambiente. A luz deve estar posicionada de forma a projetar uma sombra não muito alongada (considere um Sol às 11h da manhã no verão). Todos os itens (personagem, blocos e árvores) devem projetar sombra sobre os blocos que compõem o ambiente.
O target da(s) luz(es) deve ser o personagem. Desta forma, a luz acompanhará o personagem ao longo do ambiente, respeitando a movimentação (translação), mas não a rotação. Deve-se criar um helper para que o volume de visualização da sombra seja analisado (deve-se pressionar 'H' para habilitar/desabilitar este helper). O comportamento esperado é que as sombras sejam projetadas sempre na mesma direção. Deve-se utilizar um tamanho adequado de mapa de sombra para que tenhamos qualidade com um bom desempenho. Uma nota importante é que a área do volume da câmera virtual para geração de sombras deve aumentar/diminuir junto com a distância escolhida para o fog. Com isso teremos sempre o menor volume possível com todos os elementos projetando sombra.
Para todos os materiais, deve-se usar LambertMaterial.

---

## [T3] 35 pontos
Nesta última etapa a versão final do nosso sistema, com todas as funcionalidades necessárias para o seu uso, será desenvolvida.
Vários itens farão referência a [esta versão](https://classic.minecraft.net/?join=yWp6GZJyulPnKKP8) do Minecraft, disponível online. Este exemplo será referenciado ao longo do enunciado como "exemplo base". Acesse este exemplo antes de continuar.

#### Jogabilidade em primeira pessoa

A principal alteração em relação ao trabalho anterior será a jogabilidade em primeira pessoa. A interação esperada é a mesma do exemplo, isto é, controlar a direção pelo mouse e movimentação pelas teclas WASD, setas (que não tem no exemplo). Verifique no exemplo como a movimentação é realizada. Para pular, deve-se mapear a tecla espaço ou o botão direito do mouse. Novamente teremos uma câmera de inspeção acessada ao pressionar a tecla 'C'.

Assim como no exemplo base, deve-se criar uma forma de interagir com os blocos do ambiente através de uma [mira](https://www.google.com/search?sca_esv=6612082edc0c7c53&sxsrf=AHTn8zqWWMDOGzHlgPmPjOs2fMHAT5qLvw:1739477602759&q=crosshair&udm=2&fbs=ABzOT_BYhiZpMrUAF0c9tORwPGlsjfkTCQbVbkeDjnTQtijddBq82CQX-xUBR9s0VVH0Uz4YZWXmkEwVISjw0MO8OaXMH1pERxdbKRpzgSVqu8KOuIGlQz5RGX0LOCG8ffAQPdryRDfzbTLD1WxFPGdw4VvfhRlD75pc1t6EewqFz-p3i-3FBXAV1tHHKgjybQEdAU_i78iNiHdqPWN6GILCYC7rGmrTrA&sa=X&ved=2ahUKEwjqwe2Eu8GLAxWDLbkGHfNJNxoQtKgLegQIEhAB&biw=1920&bih=959&dpr=1). Porém, diferente do que é feito no exemplo, ao clicar com o mouse sobre um bloco para removê-lo, o mesmo deve ter uma transição de opacidade (de opaco para translúcido) de aproximadamente 2 segundos antes de ser definitivamente removido. O bloco interceptado pela mira (bloco a ser removido) deve ter algum tipo de identificação. O grupo pode usar a mesma forma de identificação do exemplo base (adição de um wireframe ) ou simplesmente mudar a cor do objeto.
Em nosso trabalho apenas removeremos blocos. Não teremos adição.
#### Mapeamento de textura
TODOS os blocos que comporão nosso ambiente serão texturizados. Para manter a mesma estética do Minecraft, as texturas devem ter baixa resolução.
Blocos que vão requerer uma atenção especial:
● Bloco terra/grama - observe no exemplo base que o bloco de terra/grama, possui texturas diferentes na parte superior e laterais. Deve-se criar um bloco como esse em nosso sistema. Importante ressaltar que esse bloco só deve aparecer na camada mais superior do ambiente, isto é, nunca teremos um bloco qualquer sobre um bloco como esse.
● Água - adicione um bloco que represente água. Este bloco deve ter uma opacidade adequada. O efeito de transição de textura disponível no exemplo base é opcional. É esperado que em alguns locais do ambiente esses blocos sejam utilizados na forma de pequenos lagos. Importante ressaltar que não há colisão com este bloco e ele não pode ser removido.
● Copa das árvores - Os blocos a serem utilizados na copa das árvores devem receber uma textura especial, com partes opacas e partes transparentes. Procure árvores no exemplo base para entender o efeito visual esperado. Utilize qualquer ferramenta de edição de imagem para gerar esse tipo de textura.
Deve-se adicionar também uma Skybox (ou Skysphere) que faça sentido com a temática do nosso sistema. Deve-se permitir que o efeito de fog seja desligado para que a skybox fique visível. Para ligar e desligar o fog, deve-se pressionar a tecla ‘F’.

#### Edificação com o builder
Deve-se adicionar uma edificação (casa, templo etc) texturizada no ambiente. O grupo pode utilizar o builder desenvolvido no T1 ou fazer a inclusão por outros meios, mas é importante que a construção seja criada pelo grupo, isto é, não pode ser importada. Utilize [este exemplo](https://videogamesandthebible.com/wp-content/uploads/2012/12/desert-temple-from-minecraft-wiki.png) como referência de complexidade mínima da construção. A edificação deve conter ao menos 3 tipos diferentes de textura.
Deve-se criar, também, uma aplicação separada (RAViewer.js e RAViewer.html) em realidade aumentada que possibilite a visualização da construção criada em um marcador fiducial (utilize o marcador [Kanji](https://www.researchgate.net/profile/Evelyn-Garnica/publication/307925742/figure/fig3/AS:404174123618306@1473374028517/Marcador-de-ARToolkit-16_W640.jpg)). Deve-se dar a opção de utilizar como fonte uma imagem, um vídeo ou câmera, exatamente como disponibilizado em [nosso repositório](https://rodrigoluis.github.io/CG/examples/AR_ChooseSource.html). Inclusive, a imagem e o vídeo podem ser os disponíveis no próprio repositório.

#### Elementos adicionais
O sistema deve ser disponibilizado na web em uma página do GitHub (Github Page). Veja detalhes de como fazer isso [aqui](https://pages.github.com/).
O sistema web deve ter uma página de carregamento (loading screen) e o sistema deve ser iniciado ao pressionar o botão START (ou outro nome parecido) presente nesta página. Novamente [há um exemplo](https://rodrigoluis.github.io/CG/examples/exampleLoadingScreenWithButton.html) de como fazer isso em nosso repositório. Utilize uma imagem de fundo que faça sentido em relação à temática da nossa aplicação. A tela de carregamento deve efetivamente corresponder aos assets sendo carregados.
Efeitos sonoros devem ser adicionados nesta versão do nosso sistema. Essencialmente você deve incluir uma música de fundo e um efeito sonoro ao remover um bloco. Mapeie a tecla 'Q' do teclado para ligar/desligar a música de fundo.