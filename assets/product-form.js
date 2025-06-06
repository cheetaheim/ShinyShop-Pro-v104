
// Utilitaire pour fetch (similaire à Dawn)
function fetchConfig(type = 'json') {
    const config = {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
    };

    if (type === 'json') {
        config.headers['Content-Type'] = 'application/json';
    }

    return config;
}

if (!customElements.get('product-form')) {
    customElements.define('product-form', class ProductForm extends HTMLElement {
        constructor() {
            super();
            this.form = this.querySelector('form');
            if (!this.form) return;
            this.form.querySelector('[name=id]').disabled = false;
            this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
            this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
            this.submitButton = this.querySelector('[type="submit"]');
            if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');
        }

        onSubmitHandler(evt) {
            evt.preventDefault();
            if (this.submitButton.getAttribute('aria-disabled') === 'true') return;
            this.handleErrorMessage();
            this.submitButton.setAttribute('aria-disabled', true);
            this.submitButton.classList.add('loading');
            this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

            var config = fetchConfig('javascript');
            config.headers['X-Requested-With'] = 'XMLHttpRequest';
            delete config.headers['Content-Type'];

            var formData = new FormData(this.form);
            if (this.cart) {
                formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
                formData.append('sections_url', window.location.pathname);
                if (this.cart.setActiveElement) this.cart.setActiveElement(document.activeElement);
            }

            this.formIdInputValue = this.form.querySelector('[name=id]').value;
            if (this.formIdInputValue.includes(',')) {
                formData.delete('id');
                formData.delete('quantity');
            }

            config.body = formData;
            this.skipCart = false;
            if (this.form.querySelector('[name=id]').dataset.skipCart && this.form.querySelector('[name=id]').dataset.skipCart === 'true') {
                this.skipCart = true;
            }

            fetch(`${window.routes?.cart_add_url || '/cart/add.js'}`, config)
                .then((response) => response.json())
                .then((response) => {
                    if (response.status) {
                        this.handleErrorMessage(response.description);
                        const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
                        if (!soldOutMessage) return;
                        this.submitButton.setAttribute('aria-disabled', true);
                        this.submitButton.querySelector('span').classList.add('hidden');
                        soldOutMessage.classList.remove('hidden');
                        this.error = true;
                        return;
                    } else if (this.skipCart) {
                        window.location = "/checkout";
                        return;
                    } else if (!this.cart) {
                        window.location = window.routes?.cart_url || '/cart';
                        return;
                    }

                    // Optionnel : publication d'événement (désactivé si non utilisé)
                    // if (!this.error && typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') publish(PUB_SUB_EVENTS.cartUpdate, {source: 'product-form'});
                    this.error = false;
                    const quickAddModal = this.closest('quick-add-modal');
                    if (quickAddModal) {
                        document.body.addEventListener('modalClosed', () => {
                            setTimeout(() => { this.cart.renderContents(response) });
                        }, { once: true });
                        quickAddModal.hide(true);
                    } else {
                        this.cart.renderContents(response);
                    }
                })
                .catch((e) => {
                    this.handleErrorMessage('Erreur lors de l\'ajout au panier');
                    console.error(e);
                })
                .finally(() => {
                    this.submitButton.classList.remove('loading');
                    if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
                    if (!this.error) this.submitButton.removeAttribute('aria-disabled');
                    this.querySelector('.loading-overlay__spinner').classList.add('hidden');
                });
        }

        handleErrorMessage(errorMessage = false) {
            this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
            if (!this.errorMessageWrapper) return;
            this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');
            this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
            if (errorMessage) {
                this.errorMessage.textContent = errorMessage;
            }
        }
    });
}

// Fallback for forms not wrapped in <product-form>
document.addEventListener('DOMContentLoaded', function () {
    document
        .querySelectorAll('form[data-type="add-to-cart-form"]')
        .forEach(function (form) {
            // Skip if already handled by custom element
            if (form.closest('product-form')) return;
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const formData = new FormData(form);
                fetch('/cart/add.js', {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' },
                })
                    .then((response) => response.json())
                    .then(() => {
                        if (document.querySelector('cart-notification')) {
                            document.querySelector('cart-notification').open();
                        } else {
                            window.location.reload();
                        }
                    })
                    .catch(() => {
                        alert("Erreur lors de l'ajout au panier");
                    });
            });
        });
});
