# Estrutura do Código do Editor 3D

Este documento descreve a organização do código do Editor 3D, facilitando a compreensão e manutenção do projeto.

## Índice

1. [Visão Geral](#visão-geral)
2. [Inicialização](#inicialização)
3. [Interface do Usuário](#interface-do-usuário)
4. [Manipulação de Formas](#manipulação-de-formas)
5. [Seleção e Transformação](#seleção-e-transformação)
6. [Agrupamento](#agrupamento)
7. [Exportação](#exportação)
8. [Utilitários](#utilitários)

## Visão Geral

O Editor 3D é uma aplicação baseada em Three.js que permite criar, manipular e exportar formas 3D. O código está organizado em funções específicas para cada aspecto da aplicação.

### Variáveis Globais

```javascript
let scene, camera, renderer, controls;
let shapes = [];
let selectedShapes = [];
let groups = [];
```

- `scene`, `camera`, `renderer`, `controls`: Objetos principais do Three.js
- `shapes`: Array que armazena todas as formas criadas
- `selectedShapes`: Array que armazena as formas selecionadas
- `groups`: Array que armazena os grupos criados

## Inicialização

### Função Principal de Inicialização

```javascript
function init() {
    initScene();
    initControls();
    setupEventListeners();
    animate();
}
```

Esta função é chamada quando a página carrega e inicializa todos os componentes da aplicação.

### Inicialização da Cena

```javascript
function initScene() { ... }
```

Responsável por:
- Criar a cena Three.js
- Configurar a câmera
- Configurar o renderizador
- Adicionar luzes (ambiente e direcional)
- Adicionar helpers (grid e eixos)
- Configurar o evento de redimensionamento da janela

### Inicialização dos Controles

```javascript
function initControls() { ... }
```

Responsável por:
- Configurar os OrbitControls para navegação na cena
- Configurar os TransformControls para manipulação de objetos

### Loop de Animação

```javascript
function animate() { ... }
```

Responsável por:
- Atualizar os controles
- Renderizar a cena
- Solicitar o próximo frame de animação

## Interface do Usuário

### Configuração de Event Listeners

```javascript
function setupEventListeners() { ... }
```

Responsável por:
- Configurar os listeners para os controles da UI
- Inicializar os controles de dimensões
- Configurar o raycaster para seleção de objetos

### Controles de Dimensões

```javascript
function updateDimensionsControls() { ... }
function addDimensionControl() { ... }
```

Responsáveis por:
- Atualizar os controles de dimensões com base no tipo de forma selecionada
- Adicionar controles de dimensão específicos para cada tipo de forma

## Manipulação de Formas

### Adição de Formas

```javascript
function addShape() { ... }
```

Responsável por:
- Obter os valores dos controles de UI
- Criar a geometria apropriada com base no tipo de forma
- Criar o material com a cor selecionada
- Criar o mesh e adicioná-lo à cena
- Adicionar a forma ao array `shapes`

### Duplicação de Formas

```javascript
function duplicateSelectedObject() { ... }
```

Responsável por:
- Clonar a geometria e o material do objeto selecionado
- Criar um novo mesh com as mesmas propriedades
- Adicionar o novo objeto à cena e ao array `shapes`

### Atualização de Propriedades

```javascript
function updateSelectedObjectColor() { ... }
function updateColorPickerFromObject() { ... }
function updateShapeProperties() { ... }
```

Responsáveis por:
- Atualizar a cor dos objetos selecionados
- Atualizar o color picker com base no objeto selecionado
- Atualizar os controles de propriedades com base no objeto selecionado

## Seleção e Transformação

### Raycasting e Seleção

```javascript
function setupRaycaster() { ... }
function toggleShapeSelection() { ... }
```

Responsáveis por:
- Configurar o raycaster para detecção de cliques em objetos
- Alternar a seleção de objetos
- Atualizar o estado visual dos objetos selecionados

### Manipulação de Seleção

```javascript
function highlightShape() { ... }
function updateSelectionInfo() { ... }
function clearSelection() { ... }
function deleteSelection() { ... }
```

Responsáveis por:
- Destacar visualmente os objetos selecionados
- Atualizar as informações de seleção na UI
- Limpar a seleção atual
- Excluir os objetos selecionados

### Controles de Teclado

```javascript
window.addEventListener('keydown', function(event) { ... });
```

Responsável por:
- Alternar entre modos de transformação (G: translação, R: rotação, S: escala)
- Duplicar objetos (Ctrl+D)

## Agrupamento

```javascript
function createGroup() { ... }
```

Responsável por:
- Criar um novo grupo Three.js
- Adicionar os objetos selecionados ao grupo
- Adicionar o grupo à cena e ao array `groups`

## Exportação

### Exportação GLB

```javascript
function exportAsGLB() { ... }
function saveArrayBuffer() { ... }
function saveString() { ... }
```

Responsáveis por:
- Criar uma cena temporária para exportação
- Exportar a cena como GLB usando GLTFExporter
- Salvar o buffer ou string resultante como arquivo

### Geração de Código

```javascript
function showGeneratedCode() { ... }
function generateThreeJSCode() { ... }
```

Responsáveis por:
- Gerar código Three.js para recriar os objetos da cena
- Exibir o código gerado em um modal
- Permitir copiar o código para a área de transferência

## Utilitários

### Redimensionamento da Janela

```javascript
function onWindowResize() { ... }
```

Responsável por:
- Atualizar a câmera e o renderizador quando a janela é redimensionada

### Helpers de Formatação

Funções auxiliares dentro de `generateThreeJSCode()` para:
- Formatar números com precisão
- Converter cores para formato hexadecimal
- Gerar nomes de variáveis únicos

---

## Fluxo de Execução

1. A página HTML carrega e chama `init()`
2. `init()` configura a cena, controles e event listeners
3. O loop de animação começa a renderizar a cena
4. O usuário interage com a interface para criar e manipular formas
5. As formas podem ser agrupadas, exportadas ou usadas para gerar código

## Dependências Externas

- Three.js: Biblioteca principal para renderização 3D
- OrbitControls: Controle de câmera para navegação
- TransformControls: Controle para transformação de objetos
- GLTFExporter: Exportação para formato GLB/GLTF
- Three-mesh-bvh: Otimização de raycasting com BVH (Bounding Volume Hierarchy)