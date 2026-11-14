describe('Filme și seriale', () => {
  it('afișează autentificarea pentru un vizitator', () => {
    cy.visit('/');
    cy.contains('Autentificare').should('be.visible');
    cy.contains('Creează cont').should('be.visible');
  });
});