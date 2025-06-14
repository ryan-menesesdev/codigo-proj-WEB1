import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, setDoc, doc, getDoc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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
const auth = getAuth(app);

let cartListenerUnsubscribe = null;

onAuthStateChanged(auth, (user) => {
    const authLink = document.getElementById('auth-link-dropdown');
    const cartCounter = document.querySelector('.header-cart-count');

    if (user) {
        if (authLink) {
            authLink.textContent = 'Sair';
            authLink.href = '#';
            authLink.onclick = (e) => {
                e.preventDefault();
                signOut(auth).then(() => {
                    console.log('Logout efetuado com sucesso. Redirecionando...');
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error('Erro ao fazer logout:', error);
                    alert('Ocorreu um erro ao tentar sair.');
                });
            };
        }
        
        const cartItemsRef = collection(db, 'carrinhos', user.uid, 'itens');
        cartListenerUnsubscribe = onSnapshot(cartItemsRef, (snapshot) => {
            const totalItems = snapshot.docs.reduce((sum, doc) => sum + doc.data().quantidade, 0);
            if (cartCounter) {
                cartCounter.textContent = totalItems;
                cartCounter.style.display = totalItems > 0 ? 'inline-block' : 'none';
            }
        });

    } else {
        if (authLink) {
            authLink.textContent = 'Login';
            authLink.href = 'login.html';
            authLink.onclick = null;
        }

        if (cartListenerUnsubscribe) {
            cartListenerUnsubscribe();
            cartListenerUnsubscribe = null;
        }
        if (cartCounter) {
            cartCounter.textContent = '0';
            cartCounter.style.display = 'none';
        }

        const currentPage = window.location.pathname;
        const isAuthPage = currentPage.includes('login.html') || currentPage.includes('register.html');
        if (document.body.dataset.logoutRedirect === "true" && !isAuthPage) {
            window.location.href = 'login.html';
        }
    }
});

const loginForm = document.querySelector('.login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('input-email').value;
        const password = document.getElementById('input-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { window.location.href = 'index.html'; })
            .catch((error) => { alert(`Erro ao fazer login: ${error.message}`); });
    });
}

const registerForm = document.querySelector('.register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('input-name').value;
        const email = document.getElementById('input-email').value;
        const phone = document.getElementById('input-phone').value;
        const cpf = document.getElementById('input-cpf').value;
        const password = document.getElementById('input-password').value;
        const confirmPassword = document.getElementById('input-confirm-password').value;
        if (password !== confirmPassword) { alert('As senhas não coincidem!'); return; }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "usuarios", user.uid), { nome: name, email: email, telefone: phone, cpf: cpf });
            alert('Cadastro realizado com sucesso!');
            window.location.href = 'login.html';
        } catch (error) {
            alert(`Erro ao se registrar: ${error.message}`);
        }
    });
}

async function adicionarAoCarrinho(productId) {
    if (!auth.currentUser) {
        alert('Você precisa estar logado para adicionar itens ao carrinho.');
        window.location.href = 'login.html';
        return;
    }
    const userId = auth.currentUser.uid;
    const cartItemRef = doc(db, 'carrinhos', userId, 'itens', productId);
    try {
        const docSnap = await getDoc(cartItemRef);
        if (docSnap.exists()) {
            await updateDoc(cartItemRef, { quantidade: increment(1) });
        } else {
            const productRef = doc(db, 'produtos', productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const productData = productSnap.data();
                await setDoc(cartItemRef, {
                    nome: productData.nome,
                    preco: productData.preco,
                    quantidade: 1
                });
            }
        }
        alert('Produto adicionado ao carrinho!');
    } catch (error) {
        console.error("Erro ao adicionar ao carrinho: ", error);
    }
}

function renderizarProdutos(produtos, containerId) {
    const gridContainer = document.getElementById(containerId);
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    if (produtos.length === 0) {
        gridContainer.innerHTML = '<p class="no-products-message">Nenhum produto encontrado.</p>';
        return;
    }
    produtos.forEach(produto => {
        const precoFormatado = produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const imagemSrc = produto.imagem || '../assets/avatar_placeholder.png';
        const itemHtml = `
            <div class="item-section-container">
                <div class="item-section-img-container"><img class="item-section-img" src="${imagemSrc}" alt="${produto.nome}" draggable="false"></div>
                <div class="item-section-description">
                    <div class="item-section-info">
                        <a class="item-section-link" href="item-display.html?id=${produto.id}&categoria=${produto.categoria}">
                            <h2 class="item-section-name">${produto.nome}</h2>
                        </a>
                        <p class="item-section-price">${precoFormatado}</p>
                    </div>
                    <div class="item-section-add"><button class="item-section-button" data-product-id="${produto.id}">Adicionar ao carrinho</button></div>
                </div>
            </div>`;
        gridContainer.innerHTML += itemHtml;
    });
    document.querySelectorAll('.item-section-button').forEach(button => {
        button.addEventListener('click', (event) => {
            adicionarAoCarrinho(event.target.dataset.productId);
        });
    });
}

async function renderizarItensDoCarrinho(containerId) {
    const container = document.getElementById(containerId);
    const totalPriceEl = document.getElementById('cart-total-price');
    if (!container) return;
    if (!auth.currentUser) {
        container.innerHTML = "<p>Você precisa estar logado para ver seu carrinho. <a href='login.html'>Fazer Login</a></p>";
        return;
    }
    const cartItemsRef = collection(db, 'carrinhos', auth.currentUser.uid, 'itens');
    onSnapshot(cartItemsRef, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = "<p>Seu carrinho está vazio.</p>";
            if (totalPriceEl) totalPriceEl.textContent = "R$ 0,00";
            return;
        }
        let html = '';
        let totalPrice = 0;
        snapshot.forEach(doc => {
            const item = doc.data();
            const itemTotal = item.preco * item.quantidade;
            totalPrice += itemTotal;
            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h3>${item.nome}</h3>
                        <p>Quantidade: ${item.quantidade}</p>
                        <p>Preço Total: ${itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>`;
        });
        container.innerHTML = html;
        if (totalPriceEl) totalPriceEl.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    });
}

async function carregarDetalhesDoProduto(productId, categoryName) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;
    if (!productId) {
        container.innerHTML = '<h1>Produto não especificado.</h1>';
        return;
    }
    try {
        const docRef = doc(db, 'produtos', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            popularPaginaDoProduto(container, docSnap.data(), productId, categoryName);
        } else {
            container.innerHTML = '<h1>Produto não encontrado.</h1>';
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes do produto:", error);
        container.innerHTML = '<h1>Ocorreu um erro ao carregar o produto.</h1>';
    }
}

function popularPaginaDoProduto(container, productData, productId, categoryName) {
    container.innerHTML = '';
    const categoryLinks = { "Bolos": "cakes.html", "Bebidas": "drinks.html", "Salgados": "snacks.html", "Sobremesas": "desserts.html" };
    const backLink = document.querySelector('.top-link');
    if (backLink) {
        backLink.href = categoryLinks[categoryName] || 'index.html';
    }
    document.title = productData.nome || "Detalhes do Produto";
    const imgContainer = document.createElement('div');
    imgContainer.className = 'item-display-section-img';
    const img = document.createElement('img');
    img.className = 'item-display-img';
    img.src = productData.imagem || '../assets/avatar_placeholder.png';
    img.alt = productData.nome;
    imgContainer.appendChild(img);
    const contentContainer = document.createElement('div');
    contentContainer.className = 'item-display-section-content';
    const textContainer = document.createElement('div');
    textContainer.className = 'item-display-section-text';
    const titleEl = document.createElement('h1');
    titleEl.className = 'item-display-title';
    titleEl.textContent = productData.nome;
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'item-display-paragraph';
    descriptionEl.textContent = productData.descricao || "Descrição não disponível.";
    const priceEl = document.createElement('p');
    priceEl.className = 'item-display-paragraph';
    priceEl.textContent = `Preço: ${productData.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    textContainer.appendChild(titleEl);
    textContainer.appendChild(descriptionEl);
    textContainer.appendChild(priceEl);
    const addButton = document.createElement('button');
    addButton.className = 'item-display-button';
    addButton.textContent = 'Adicionar ao carrinho';
    addButton.addEventListener('click', () => {
        adicionarAoCarrinho(productId);
    });
    contentContainer.appendChild(textContainer);
    contentContainer.appendChild(addButton);
    container.appendChild(imgContainer);
    container.appendChild(contentContainer);
}

async function buscarProdutosPorCategoria(categoria, containerId) {
    try {
        const q = query(collection(db, 'produtos'), where('categoria', '==', categoria));
        const querySnapshot = await getDocs(q);
        const produtos = [];
        querySnapshot.forEach(doc => {
            produtos.push({ id: doc.id, ...doc.data() });
        });
        renderizarProdutos(produtos, containerId);
    } catch (error) {
        console.error(`Erro ao buscar produtos: `, error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const categoryName = urlParams.get('categoria');
    const pagePath = window.location.pathname;

    if (pagePath.includes('cakes.html')) buscarProdutosPorCategoria('Bolos', 'bolos-produtos-grid');
    else if (pagePath.includes('drinks.html')) buscarProdutosPorCategoria('Bebidas', 'bebidas-produtos-grid');
    else if (pagePath.includes('snacks.html')) buscarProdutosPorCategoria('Salgados', 'salgados-produtos-grid');
    else if (pagePath.includes('desserts.html')) buscarProdutosPorCategoria('Sobremesas', 'sobremesas-produtos-grid');
    else if (pagePath.includes('cart.html')) renderizarItensDoCarrinho('cart-items-container');
    else if (pagePath.includes('item-display.html')) {
        carregarDetalhesDoProduto(productId, categoryName);
    }
});