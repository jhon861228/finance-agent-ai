# Documentación de Flujos del Backend

Este documento detalla la arquitectura de Event Sourcing y cómo se procesan los comandos principales del sistema, incluyendo la actualización de las proyecciones (Read Models).

## Arquitectura General
El sistema utiliza un patrón **CQRS (Command Query Responsibility Segregation)** con **Event Sourcing**:
1.  **Comandos**: Acciones del usuario que intentan cambiar el estado.
2.  **Event Store**: Almacenamiento inmutable de todos los eventos del dominio.
3.  **Proyecciones**: Modelos de lectura optimizados que se actualizan de forma asíncrona reaccionando a los eventos.

---

## 1. Creación de Usuario
Cuando un nuevo usuario se registra.

```mermaid
sequenceDiagram
    participant U as Usuario/Frontend
    participant API as ApiHandler
    participant CP as CommandProcessor
    participant ES as EventStore (DynamoDB)
    participant SP as StreamProcessor (Lambda)
    participant P as Projector
    participant RM as ReadModels (DynamoDB)

    U->>API: POST /api/auth/register
    API->>CP: Process(RegisterUser)
    CP->>ES: Save(UserCreatedEvent)
    ES-->>CP: Confirmado
    CP-->>API: Éxito
    API-->>U: Usuario Creado

    Note over ES, RM: Proceso Asíncrono (DynamoDB Streams)
    ES->>SP: Trigger(UserCreatedEvent)
    SP->>P: apply(UserCreatedEvent)
    P->>RM: Update(User PK=USER#id)
    Note right of RM: Se crea el registro del usuario<br/>para búsquedas rápidas.
```

---

## 2. Creación de Grupo
Involucra la creación del grupo y la adición automática del creador como primer miembro.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant API as ApiHandler
    participant CP as CommandProcessor
    participant AG as ExpenseGroup (Aggregate)
    participant ES as EventStore
    participant SP as StreamProcessor
    participant P as Projector
    participant RM as ReadModels

    U->>API: POST /api/groups
    API->>CP: Process(CreateGroup)
    CP->>AG: createGroup(name, creator)
    AG->>AG: Generar GroupCreated
    AG->>AG: Generar MemberAdded
    CP->>ES: Save([GroupCreated, MemberAdded])
    CP-->>API: Éxito
    API-->>U: Grupo Creado

    Note over ES, RM: Actualización de Proyecciones
    ES->>SP: Stream Events
    SP->>P: apply(GroupCreated)
    P->>RM: Insert(GROUP#id, metadata)
    SP->>P: apply(MemberAdded)
    P->>RM: Insert(MEMBER#id, membership info)
```

---

## 3. Agregar Gasto
El flujo crítico donde se actualizan los balances.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant API as ApiHandler
    participant CP as CommandProcessor
    participant AG as ExpenseGroup
    participant ES as EventStore
    participant SP as StreamProcessor
    participant P as Projector
    participant RM as ReadModels

    U->>API: POST /api/groups/:id/expenses
    API->>CP: Process(AddExpense)
    CP->>AG: addExpense(amount, description, payer)
    AG->>AG: Generar ExpenseAdded
    CP->>ES: Save(ExpenseAdded)
    CP-->>API: Éxito

    Note over ES, RM: Proyección de Gastos y Balances
    ES->>SP: Event(ExpenseAdded)
    SP->>P: apply(ExpenseAdded)
    P->>RM: Update Group Stats (TotalSpent += Amount)
    P->>RM: Update Member Balance (PayerBalance += Amount)
    P->>RM: Insert Expense Record (PK=GROUP#id, SK=EXPENSE#id)
```

---

## 4. Liquidación de Cuentas
Cuando un miembro paga lo que debe a otro para saldar la deuda.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant API as ApiHandler
    participant CP as CommandProcessor
    participant AG as ExpenseGroup
    participant ES as EventStore
    participant SP as StreamProcessor
    participant P as Projector
    participant RM as ReadModels

    U->>API: POST /api/groups/:id/settle
    API->>CP: Process(SettleDebt)
    CP->>AG: settleDebt(from, to, amount)
    AG->>AG: Generar DebtSettled
    CP->>ES: Save(DebtSettled)
    CP-->>API: Éxito

    Note over ES, RM: Ajuste de Balances
    ES->>SP: Event(DebtSettled)
    SP->>P: apply(DebtSettled)
    P->>RM: Update Balance (PayerBalance -= Amount)
    P->>RM: Update Balance (ReceiverBalance += Amount)
    Note right of RM: Los balances se ajustan<br/>en tiempo real.
```

---

## Lógica de Actualización de Proyecciones
El `StreamProcessor` se activa cada vez que DynamoDB detecta una nueva entrada en la tabla `event_store`. 

1.  **Captura**: La Lambda recibe el `INSERT` del evento.
2.  **Identificación**: Se identifica el tipo de evento (`GROUP_CREATED`, `EXPENSE_ADDED`, etc.).
3.  **Acción**: El `Projector` ejecuta la lógica correspondiente en la tabla `read_models`. 
    -   Utiliza operaciones atómicas como `ADD` para los balances para evitar condiciones de carrera.
    -   Permite que las vistas del frontend (como el Dashboard o los detalles del grupo) carguen datos pre-calculados al instante sin tener que recorrer todo el historial de eventos.
