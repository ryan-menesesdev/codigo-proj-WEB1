import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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

onAuthStateChanged(auth, (user) => {
    const authLink = document.getElementById('auth-link-dropdown');

    if (authLink) {
        if (user) {
            authLink.textContent = 'Sair';
            authLink.href = '#';
            authLink.onclick = (event) => {
                event.preventDefault();
                signOut(auth).then(() => {
                    alert('Você foi desconectado.');
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error('Erro ao fazer logout:', error);
                });
            };
        } else {
            authLink.textContent = 'Login';
            authLink.href = 'login.html';
            authLink.onclick = null;
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
            .then((userCredential) => {
                alert('Login efetuado com sucesso!');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                alert(`Erro ao fazer login: ${error.message}`);
            });
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

        if (password !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: name,
                email: email,
                telefone: phone,
                cpf: cpf
            });
            alert('Cadastro realizado com sucesso! Você será redirecionado para a página de login.');
            window.location.href = 'login.html';
        } catch (error) {
            alert(`Erro ao se registrar: ${error.message}`);
        }
    });
}

/**
 * @param {Array} produtos 
 * @param {string} containerId 
 */
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
            </div>`;
        gridContainer.innerHTML += itemHtml;
    });

    document.querySelectorAll('.item-section-button').forEach(button => {
        button.addEventListener('click', (event) => {
            if (auth.currentUser) {
                const produtoId = event.target.dataset.productId;
                console.log('Usuário logado. Produto adicionado ao carrinho (ID):', produtoId);
                alert('Produto adicionado ao carrinho!');
            } else {
                alert('Você precisa estar logado para adicionar itens ao carrinho.');
                window.location.href = 'login.html';
            }
        });
    });

    document.querySelectorAll('.item-section-img').forEach(img => {
        img.addEventListener('dragstart', (e) => e.preventDefault());
    });
}

/**
 * @param {string} categoria
 * @param {string} containerId 
 */
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