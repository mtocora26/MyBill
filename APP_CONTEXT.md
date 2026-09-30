# Contexto de la aplicacion MyBill

## Proposito

MyBill es un gestor sencillo de finanzas personales para registrar ingresos y gastos, entender a donde va el dinero y consultar reportes claros. Nace para reemplazar una hoja de Excel que resulta poco comoda de usar en el dia a dia.

La prioridad es que sea facil de usar, funcione en el celular y no requiera mantener servidores ni una infraestructura compleja. El proyecto comienza para una persona. La posibilidad de uso compartido con la familia queda como una extension futura, no como requisito de la primera version.

## Necesidades principales

- Registrar ingresos y gastos rapidamente.
- Consultar los movimientos anteriores y corregirlos cuando sea necesario.
- Ver un resumen del periodo y graficas faciles de entender.
- Usar la app desde un celular y, cuando convenga, desde un computador.
- Poder registrar y consultar datos sin conexion despues de instalar/cargar la aplicacion.
- Exportar los movimientos para abrirlos en Excel.
- Crear y restaurar copias de seguridad para reducir el riesgo de perder informacion.
- Evitar cuentas, suscripciones, sincronizacion en la nube y servidores de base de datos en la primera version.

## Experiencia y plataformas

La primera opcion recomendada es una **Progressive Web App (PWA)**:

- Se accede desde el navegador de un computador.
- En el celular se puede instalar desde el navegador y abrir desde un icono, como una aplicacion.
- Una vez cargada e instalada, la interfaz y las funciones principales deben estar disponibles sin conexion.
- La primera visita/instalacion y la descarga de actualizaciones requieren conexion a internet.
- La interfaz debe adaptarse a pantallas pequenas y grandes. El celular es el dispositivo prioritario.

No se necesita publicar inicialmente en una tienda de aplicaciones. Vercel puede alojar los archivos estaticos de la PWA, pero no sera el almacenamiento de los movimientos ni una base de datos. El objetivo es no tener que administrar un servidor; la plataforma de alojamiento solo entrega la aplicacion y sus actualizaciones.

## Persistencia, privacidad y copias

### Almacenamiento principal

- Guardar los datos en el dispositivo, usando **IndexedDB** desde la aplicacion web.
- El uso debe seguir siendo posible sin internet una vez que la PWA este instalada y haya cargado sus recursos.
- No se borran los datos simplemente por dejar de usar la aplicacion.
- Los datos de IndexedDB pertenecen al perfil/navegador de cada dispositivo. El celular y el computador tendran almacenamientos separados.
- Eliminar los datos del navegador, desinstalar/borrar los datos de la app, reiniciar el dispositivo a fabrica o perder el dispositivo puede hacer que los registros se pierdan.
- La app debe solicitar almacenamiento persistente cuando el navegador lo permita (`navigator.storage.persist()`), entendiendo que el navegador puede rechazarlo y que esto no reemplaza un respaldo.

### Copias de seguridad y exportacion

La primera version debe ofrecer dos funciones diferentes:

1. **Respaldo/restauracion JSON:** archivo completo de la aplicacion, con version de esquema, movimientos y cualquier dato necesario para reconstruirlos. Debe poder guardarse manualmente en OneDrive y restaurarse en el mismo u otro dispositivo. Validar el archivo antes de importarlo y explicar si la restauracion reemplaza o combina datos.
2. **Exportacion CSV:** formato compatible con Excel para analizar o imprimir movimientos. CSV es una exportacion de trabajo, no el respaldo completo de la aplicacion.

La app no debe sincronizar un archivo de base de datos activo a traves de OneDrive. La copia a OneDrive es manual y solo ocurre al exportar el archivo. Sin un servicio de sincronizacion, los dispositivos no comparten cambios automaticamente.

### Privacidad

- Los movimientos financieros permanecen en el dispositivo y no se envian a un servidor de la app.
- No incluir analiticas, publicidad ni seguimiento de movimientos en la primera version.
- IndexedDB no cifra automaticamente los datos. Recomendar mantener bloqueado el celular/computador; no afirmar que el almacenamiento local equivale a una caja fuerte cifrada.

## Alcance de la primera version (MVP)

### Movimientos

Cada movimiento debe incluir:

- Identificador estable.
- Tipo: ingreso o gasto.
- Importe positivo.
- Fecha.
- Categoria.
- Descripcion o nota opcional.
- Fecha de creacion y de ultima modificacion, si resulta util para respaldo e integridad.

Permitir crear, listar, editar y eliminar movimientos. Confirmar antes de eliminar. Evitar modificar totales a mano: los resumenes se calculan desde los movimientos.

Representar importes de forma segura (por ejemplo, unidades menores enteras, no aritmetica de punto flotante sin control). La moneda y los decimales deben ser configurables o confirmarse antes de implementar; no asumir un pais o moneda.

### Categorias

- Incluir categorias iniciales utiles para ingresos y gastos.
- Permitir elegir una categoria al crear un movimiento.
- Mantener la lista simple; categorias personalizadas pueden incluirse si no complican el MVP.
- No asumir que una categoria eliminada debe borrar los movimientos historicos asociados.

### Inicio y reportes

- Resumen del periodo seleccionado: ingresos, gastos y balance neto.
- Selector de periodo, empezando por el mes actual.
- Grafica de gastos por categoria.
- Evolucion de ingresos y gastos por mes.
- Lista de movimientos recientes y acceso al historial.
- Filtros basicos por periodo, tipo y categoria.
- Mostrar estados vacios claros cuando aun no hay movimientos.

Las graficas deben ayudar a responder preguntas practicas, no ser decoracion. Los totales siempre deben poder consultarse tambien como texto accesible.

### Respaldo y ajustes

- Exportar CSV.
- Crear respaldo JSON.
- Restaurar desde respaldo JSON con validacion y una confirmacion clara del efecto.
- Mostrar la fecha del ultimo respaldo creado en este dispositivo, si se puede mantener sin complejidad.
- Permitir elegir moneda y formato regional.

## Fuera de alcance inicialmente

Para mantener el proyecto pequeno, no implementar en el MVP:

- Inicio de sesion o perfiles.
- Sincronizacion automatica entre celular y computador.
- Base de datos en la nube o backend propio.
- Edicion simultanea por varios miembros de la familia.
- Conexion automatica con bancos o tarjetas.
- Lectura de recibos mediante camara/OCR.
- Presupuestos complejos, prestamos, inversiones o conciliacion bancaria.
- Notificaciones y recordatorios obligatorios.
- Aplicaciones nativas separadas para Android e iOS.

Si en el futuro es indispensable que varias personas compartan y actualicen el mismo registro, entonces se evaluara un servicio de sincronizacion y autenticacion. Eso implica que los datos residiran tambien en la nube y cambia la decision de privacidad/infraestructura.

## Modelo de datos inicial

### Movimiento

- `id`: identificador unico estable.
- `type`: `income` o `expense`.
- `amountMinor`: importe como entero en unidades menores de la moneda.
- `currency`: codigo de moneda, o valor de configuracion si la app solo maneja una moneda.
- `date`: fecha del movimiento, independiente de la fecha en que fue registrado.
- `categoryId`: referencia a la categoria.
- `note`: texto opcional.
- `createdAt` y `updatedAt`: marcas de tiempo para mantenimiento/importacion.

### Categoria

- `id`: identificador estable.
- `name`: nombre visible.
- `type`: tipo de movimientos a los que aplica, si se decide separar ingresos de gastos.
- `isArchived`: permite dejar de usar una categoria sin perder su historial.

La implementacion puede ajustar este esquema al elegir framework y biblioteca, pero debe preservar los conceptos y permitir evolucionar el formato de respaldo mediante una version de esquema.

## Requisitos de calidad

- La interfaz debe estar en espanol inicialmente.
- El registro habitual debe poder completarse con pocos campos y pocos toques.
- Diseno adaptable, con controles comodos para usar con una mano en celular.
- Debe funcionar offline para ver, crear, editar, borrar y calcular reportes.
- Debe dar mensajes claros ante errores de importacion/exportacion y no borrar datos silenciosamente.
- El CSV debe manejar correctamente caracteres con tilde, separadores y formato de importes.
- Los totales se recalculan a partir de los movimientos y respetan el periodo y filtros seleccionados.
- Probar flujos esenciales: crear ingreso/gasto, editar, eliminar, reportar, operar sin conexion y respaldar/restaurar.

## Decisiones tomadas

- Empezar con una aplicacion personal para un solo usuario.
- Priorizar uso desde celular, con acceso tambien desde computador.
- Elegir PWA como primera forma de distribucion, en vez de desarrollar dos apps nativas.
- Guardar los datos localmente en el dispositivo; no usar base de datos remota en el MVP.
- Habilitar uso offline despues de la primera carga/instalacion.
- Incluir respaldo JSON restaurable y exportacion CSV para Excel.
- No asumir sincronizacion automatica entre dispositivos.
- Mantener el alcance deliberadamente pequeno.

## Decisiones pendientes antes de construir

- Moneda y pais/formato regional por defecto.
- Si categorias personalizadas son necesarias desde el primer lanzamiento.
- Si se necesita registrar cuentas (efectivo, debito, credito) o basta con categorias y notas.
- Politica de restauracion: reemplazar los datos existentes o combinar respaldos con deteccion de duplicados. Para el primer MVP, reemplazo con confirmacion es mas sencillo; la combinacion requiere reglas adicionales.
- Framework y biblioteca de graficas concretos, segun la estructura que se cree para el proyecto.

## Fases sugeridas

1. Construir la PWA y almacenamiento IndexedDB; registrar, listar, editar y eliminar movimientos sin conexion.
2. Agregar resumen mensual, filtros y graficas.
3. Agregar exportacion CSV y respaldo/restauracion JSON; probar recuperacion en un segundo navegador/dispositivo.
4. Usar la app personalmente y ajustar categorias y flujo a partir del uso real.
5. Considerar sincronizacion familiar solo si el uso demuestra que hace falta.
