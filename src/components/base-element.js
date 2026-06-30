// src/components/base-element.js
/**
 * Base mínima para custom elements de la app. No es un framework: solo
 * evita repetir boilerplate de shadow DOM + render + emisión de eventos.
 */
export class BaseElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /** Sobrescribir: debe devolver el HTML (string) del componente. */
  template() {
    return '';
  }

  /** Sobrescribir: CSS del componente. */
  styles() {
    return '';
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${this.styles()}</style>${this.template()}`;
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  $all(selector) {
    return [...this.shadowRoot.querySelectorAll(selector)];
  }

  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}