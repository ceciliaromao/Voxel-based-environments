# COMPUTAÇÃO GRÁFICA – 2024.3
#### Prof. Rodrigo L. S. Silva

---

## Voxel-based environments - 30 pontos
Este trabalho consiste na criação de um protótipo de modelagem baseado em voxels (voxel-based modelling). Esse tipo de modelagem é muito utilizada em jogos baseados em voxels, sendo Minecraft o mais famoso exemplo. Nesta primeira etapa o foco será no desenvolvimento dos elementos básicos deste protótipo, incluindo a possibilidade de adicionar e remover voxels, carregar e salvar um grupo de voxels em arquivo etc.

---
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

---
#### Ambiente de execução
No ambiente de execução teremos um mapa baseado em voxels (exemplo meramente ilustrado na Figura 1 ao lado). O ambiente a ser criado no T1 deve ser semelhante ao ilustrado neste mapa. No mapa a área N0 tem altura 0 (é o plano base), N1 tem altura 1 e N2 tem altura 2. A forma como os voxels que comporão os níveis N1 e N2 serão inseridos no ambiente ficarão a critério do grupo.
Nas indicações marcadas pela letra “T” serão inseridas as árvores criadas no ambiente de modelagem. Como três modelos de árvores devem ser criados, dois objetos de cada modelo devem ser inseridos no ambiente de execução.
Aprimoramentos visuais serão incluídos nos próximos trabalhos.

_Controle de câmera_
Utilizaremos neste trabalho dois tipos de câmera: uma câmera de inspeção (_orbitControls_) e uma câmera em primeira pessoa (_first person camera_). Em nosso repositório, utilize o projeto _exampleFirstPerson_ como base para a implementação desta segunda câmera. As câmeras serão alternadas pressionando a tecla ‘C’ do teclado. Deve-se armazenar a posição anterior de cada câmera ao alternar entre os modos para que, ao voltar para a câmera anterior, a posição seja a mesma.

___
#### Outros
Para esta versão, utilize como material dos blocos o comando setDefaultMaterial, passando as cores como parâmetro.
Para iluminar o ambiente, utilize o comando _initDefaultBasicLight(scene)_. Essas duas funções foram utilizadas em nosso primeiro exemplo (_basicScene.js_). O sistema definitivo de iluminação do projeto será definido em detalhes nos próximos trabalhos.