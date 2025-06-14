// import { initializeApp } from "firebase/app";
// import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBfsAqNVdA2YJGGiHYGOk_lKTgc9fO--aM",
  authDomain: "projeto-ifsp-3-semestre.firebaseapp.com",
  projectId: "projeto-ifsp-3-semestre",
  storageBucket: "projeto-ifsp-3-semestre.firebasestorage.app",
  messagingSenderId: "723939427008",
  appId: "1:723939427008:web:0ce661dc92adb7598be325"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * 
 * @param {Array} produtos 
 * @param {string} containerId 
 */
function renderizarProdutos(produtos, containerId) {
    const gridContainer = document.getElementById(containerId);
    if (!gridContainer) {
        console.error(`Contêiner com ID '${containerId}' não encontrado.`);
        return;
    }

    gridContainer.innerHTML = ''; 

    if (produtos.length === 0) {
        gridContainer.innerHTML = '<p class="no-products-message">Nenhum produto encontrado nesta categoria no momento.</p>';
        return;
    }

    produtos.forEach(produto => {
        const precoFormatado = produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const itemHtml = `
            <div class="item-section-container">
                <div class="item-section-img-container">
                    <img class="item-section-img" src="${produto.imagem}" alt="${produto.nome}" draggable="false">
                </div>
                <div class="item-section-description">
                    <div class="item-section-info">
                        <a class="item-section-link" href="item-display.html?id=${produto.id}">
                            <h2 class="item-section-name">${produto.nome}</h2>
                        </a>
                        <p class="item-section-price">${precoFormatado}</p>
                    </div>
                    <div class="item-section-add">
                        <button class="item-section-button" data-product-id="${produto.id}">Adicionar ao carrinho</button>
                    </div>
                </div>
            </div>
        `;
        gridContainer.innerHTML += itemHtml;
    });

    document.querySelectorAll('.item-section-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const produtoId = event.target.dataset.productId;
            console.log('Produto adicionado ao carrinho (ID):', produtoId);
        });
    });

    document.querySelectorAll('.item-section-img').forEach(img => {
        img.addEventListener('dragstart', (event) => {
            event.preventDefault();
        });
    });
}

/**
 * 
 * @param {string} categoria
 * @param {string} containerId 
 */
async function buscarProdutosPorCategoria(categoria, containerId) {
    try {
        const produtosRef = collection(db, 'produtos');
        const q = query(produtosRef, where('categoria', '==', categoria));
        
        const querySnapshot = await getDocs(q);
        
        const produtos = [];
        querySnapshot.forEach(doc => {
            produtos.push({ id: doc.id, ...doc.data() });
        });
        renderizarProdutos(produtos, containerId);
    } catch (error) {
        console.error(`Erro ao buscar produtos da categoria '${categoria}': `, error);
        const gridContainer = document.getElementById(containerId);
        if (gridContainer) {
            gridContainer.innerHTML = '<p class="error-message">Erro ao carregar produtos. Tente novamente mais tarde.</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {    
    const pageTitle = document.title;
    if (pageTitle.includes('Bolos')) {
        buscarProdutosPorCategoria('Bolos', 'bolos-produtos-grid');
    } else if (pageTitle.includes('Bebidas')) {
        buscarProdutosPorCategoria('Bebidas', 'bebidas-produtos-grid');
    } else if (pageTitle.includes('Salgados')) {
        buscarProdutosPorCategoria('Salgados', 'salgados-produtos-grid');
    } else if (pageTitle.includes('Sobremesas')) {
        buscarProdutosPorCategoria('Sobremesas', 'sobremesas-produtos-grid');
    }
});
