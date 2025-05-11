// Script AJAX pour l'ajout au panier sur la page produit

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('form[data-type="add-to-cart-form"]').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation(); // Bloque toute autre soumission native

      const formData = new FormData(form);
      fetch('/cart/add.js', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      })
      .then(response => response.json())
      .then(data => {
        // Ouvre la notification panier si présente
        if (document.querySelector('cart-notification')) {
          document.querySelector('cart-notification').open();
        } else {
          // Sinon, recharger la page ou afficher un message
          window.location.reload();
        }
      })
      .catch(error => {
        alert('Erreur lors de l\'ajout au panier');
      });
    });
  });
});
