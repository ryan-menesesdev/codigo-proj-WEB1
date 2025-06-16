import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, setDoc, doc, getDoc, updateDoc, increment, onSnapshot, deleteDoc, serverTimestamp, addDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
let todosOsProdutosDaPagina = [];
let containerIdAtual = '';

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

async function updateCartItemQuantity(productId, newQuantity) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const cartItemRef = doc(db, 'carrinhos', userId, 'itens', productId);
    if (newQuantity <= 0) {
        await deleteCartItem(productId);
    } else {
        await updateDoc(cartItemRef, { quantidade: newQuantity });
    }
}

async function deleteCartItem(productId) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const cartItemRef = doc(db, 'carrinhos', userId, 'itens', productId);
    try {
        await deleteDoc(cartItemRef);
    } catch (error) {
        console.error("Erro ao remover item: ", error);
    }
}

async function finalizePurchase() {
    const paymentMethodEl = document.getElementById('payment-method');
    if (!paymentMethodEl || !paymentMethodEl.value) {
        alert('Por favor, selecione uma forma de pagamento.');
        return;
    }
    const paymentMethod = paymentMethodEl.value;
    if (!auth.currentUser) { alert('Sua sessão expirou. Faça login novamente.'); return; }
    const checkoutButton = document.getElementById('checkout-button');
    checkoutButton.disabled = true;
    checkoutButton.textContent = 'Processando...';
    const userId = auth.currentUser.uid;
    const cartItemsRef = collection(db, 'carrinhos', userId, 'itens');
    const cartSnapshot = await getDocs(cartItemsRef);
    if (cartSnapshot.empty) {
        alert('Seu carrinho está vazio.');
        checkoutButton.disabled = false;
        checkoutButton.textContent = 'Finalizar compra';
        return;
    }
    const items = cartSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalPrice = items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const orderData = {
        userId: userId,
        userEmail: auth.currentUser.email,
        items: items,
        totalPrice: totalPrice,
        paymentMethod: paymentMethod,
        status: "Pendente",
        createdAt: serverTimestamp()
    };
    try {
        const orderRef = await addDoc(collection(db, 'pedidos'), orderData);
        const batch = writeBatch(db);
        cartSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert(`Pedido finalizado com sucesso!`);
        window.location.href = `payment.html?orderId=${orderRef.id}`;
    } catch (error) {
        console.error("Erro ao finalizar o pedido: ", error);
        alert('Ocorreu um erro ao finalizar seu pedido.');
        checkoutButton.disabled = false;
        checkoutButton.textContent = 'Finalizar compra';
    }
}

function aplicarOrdenacaoERenderizar() {
    const tipoOrdenacao = document.getElementById('sort-filter').value;
    let produtosOrdenados = [...todosOsProdutosDaPagina];
    switch (tipoOrdenacao) {
        case 'preco-asc':
            produtosOrdenados.sort((a, b) => a.preco - b.preco);
            break;
        case 'preco-desc':
            produtosOrdenados.sort((a, b) => b.preco - a.preco);
            break;
        case 'nome-asc':
            produtosOrdenados.sort((a, b) => a.nome.localeCompare(b.nome));
            break;
    }
    renderizarProdutos(produtosOrdenados, containerIdAtual);
}

async function buscarProdutosPorCategoria(categoria, containerId) {
    containerIdAtual = containerId;
    try {
        const q = query(collection(db, 'produtos'), where('categoria', '==', categoria));
        const querySnapshot = await getDocs(q);
        todosOsProdutosDaPagina = [];
        querySnapshot.forEach(doc => {
            todosOsProdutosDaPagina.push({ id: doc.id, ...doc.data() });
        });
        aplicarOrdenacaoERenderizar();
    } catch (error) {
        console.error(`Erro ao buscar produtos: `, error);
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
        container.innerHTML = "<h2>Seu carrinho</h2><p>Você precisa estar logado para ver seu carrinho. <a href='login.html'>Fazer Login</a></p>";
        return;
    }
    const cartItemsRef = collection(db, 'carrinhos', auth.currentUser.uid, 'itens');
    onSnapshot(cartItemsRef, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = "<p>Seu carrinho está vazio.</p>";
            if (totalPriceEl) totalPriceEl.textContent = "Total: R$ 0,00";
            return;
        }
        container.innerHTML = '';
        let totalPrice = 0;
        snapshot.forEach(doc => {
            const item = doc.data();
            const productId = doc.id;
            const itemTotal = item.preco * item.quantidade;
            totalPrice += itemTotal;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-section-item';
            itemDiv.innerHTML = `
                <div class="cart-section-img-container">
                    <img class="cart-section-img" src="${item.imagem || '../assets/avatar_placeholder.png'}">
                    <h2 class="cart-section-name">${item.nome}</h2>
                </div>
                <div class="cart-section-quantity-container">
                    <button class="cart-section-button decrease-qty" data-id="${productId}"><i class="fas fa-minus"></i></button>
                    <p class="cart-section-quantity">${item.quantidade}</p>
                    <button class="cart-section-button increase-qty" data-id="${productId}"><i class="fas fa-plus"></i></button>
                </div>
                <div class="cart-section-price-container">
                    <p class="cart-section-price">Preço: ${itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div class="cart-section-trash-container">
                    <button class="cart-section-button delete-item" data-id="${productId}"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            container.appendChild(itemDiv);
            itemDiv.querySelector('.decrease-qty').addEventListener('click', () => updateCartItemQuantity(productId, item.quantidade - 1));
            itemDiv.querySelector('.increase-qty').addEventListener('click', () => updateCartItemQuantity(productId, item.quantidade + 1));
            itemDiv.querySelector('.delete-item').addEventListener('click', () => deleteCartItem(productId));
        });
        if (totalPriceEl) {
            totalPriceEl.textContent = `Total: ${totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        }
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
    priceEl.textContent = `Preço: ${productData.preco.toLocaleString('pt-BR', { style: 'currency', 'currency': 'BRL' })}`;
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

function setupSortEventListener() {
    const sortSelect = document.getElementById('sort-filter');
    if (sortSelect) {
        sortSelect.addEventListener('change', aplicarOrdenacaoERenderizar);
    }
}

onAuthStateChanged(auth, (user) => {
    const authLink = document.getElementById('auth-link-dropdown');
    const cartCounter = document.querySelector('.header-cart-count');
    if (user) {
        if (authLink) {
            authLink.textContent = 'Sair';
            authLink.href = '#';
            authLink.onclick = (e) => {
                e.preventDefault();
                signOut(auth).then(() => { window.location.href = 'login.html'; }).catch((error) => console.error('Erro ao fazer logout:', error));
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
        if (window.location.pathname.includes('cart.html')) {
            renderizarItensDoCarrinho('cart-items-list');
        }
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
        if (window.location.pathname.includes('cart.html')) {
            const cartContainer = document.getElementById('cart-items-list');
            const totalPriceEl = document.getElementById('cart-total-price');
            const paymentSection = document.querySelector('.cart-section-payment');

            if (cartContainer) {
                cartContainer.innerHTML = '<p>Seu carrinho está vazio. <a href="login.html" style="color: #c01f13; text-decoration: underline;">Faça login</a> para adicionar itens.</p>';
            }
            if (totalPriceEl) {
                totalPriceEl.textContent = 'Total: R$ 0,00';
            }
            if(paymentSection){
                paymentSection.style.display = 'none';
            }
        }
    }
});

const loginFormEl = document.querySelector('.login-form');
if (loginFormEl) {
    loginFormEl.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('input-email').value;
        const password = document.getElementById('input-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { window.location.href = 'index.html'; })
            .catch((error) => { alert('Não existe conta com essas informações! Registre-se!'); });
    });
}

const registerFormEl = document.querySelector('.register-form');
if (registerFormEl) {

    const phoneInput = document.getElementById('input-phone');
    const cpfInput = document.getElementById('input-cpf');

    const formatarInputNumerico = (event) => {
        const input = event.target;
        input.value = input.value.replace(/\D/g, '');
    };

    if(phoneInput) phoneInput.addEventListener('input', formatarInputNumerico);
    if(cpfInput) cpfInput.addEventListener('input', formatarInputNumerico);

    registerFormEl.addEventListener('submit', async (event) => {
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

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const categoryName = urlParams.get('categoria');
    const orderId = urlParams.get('orderId');
    const pagePath = window.location.pathname;

    if (pagePath.includes('cakes.html') || pagePath.includes('drinks.html') || pagePath.includes('snacks.html') || pagePath.includes('desserts.html')) {
        setupSortEventListener();
    }

    if (pagePath.includes('cakes.html')) buscarProdutosPorCategoria('Bolos', 'bolos-produtos-grid');
    else if (pagePath.includes('drinks.html')) buscarProdutosPorCategoria('Bebidas', 'bebidas-produtos-grid');
    else if (pagePath.includes('snacks.html')) buscarProdutosPorCategoria('Salgados', 'salgados-produtos-grid');
    else if (pagePath.includes('desserts.html')) buscarProdutosPorCategoria('Sobremesas', 'sobremesas-produtos-grid');
    else if (pagePath.includes('item-display.html')) {
        carregarDetalhesDoProduto(productId, categoryName);
    }
    else if (pagePath.includes('cart.html')) {
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.addEventListener('click', finalizePurchase);
        }
    }
    else if (pagePath.includes('payment.html')) {
        displayOrderConfirmation(orderId);
    }
});