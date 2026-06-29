-- ============================================================
-- AÇÃO TRADE ESTOQUE — Schema Oracle
-- Schema: TRADEMARKETING
-- Prefixo: ET_  (Estoque Trade — separado de PM_ Promotoria)
-- Data DDL: 2026-06-09
-- ============================================================
-- Ordem de execução:
--   1. Drops em cascata (ordem inversa das FKs)
--   2. CREATE TABLE com constraints
--   3. Índices de performance
--   4. Comments de documentação
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. LIMPEZA — remove se já existir
--    CASCADE CONSTRAINTS garante que as FKs não bloqueiam
-- ─────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_SOLICITACOES CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_DOCUMENTOS CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_MOVIMENTACOES CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_MATERIAIS CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_MARCADORES CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_LOCALIZACOES CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_CATEGORIAS CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ET_USUARIOS CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────
-- 2. ET_USUARIOS
--    Usuários do sistema com controle de acesso por perfil
-- ─────────────────────────────────────────────
CREATE TABLE ET_USUARIOS (
    ID              VARCHAR2(36)   NOT NULL,
    NOME            VARCHAR2(255)  NOT NULL,
    EMAIL           VARCHAR2(255)  NOT NULL,
    PERFIL          VARCHAR2(20)   NOT NULL,
    AVATAR_URL      VARCHAR2(1000),
    SENHA_HASH      VARCHAR2(500),
    SENHA_SALT      VARCHAR2(255),
    DT_CRIACAO      TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    DT_ATUALIZACAO  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_USR       PRIMARY KEY (ID),
    CONSTRAINT UQ_ET_USR_EMAIL UNIQUE      (EMAIL),
    CONSTRAINT CK_ET_USR_PERFIL CHECK (PERFIL IN ('ADMINISTRADOR','GESTOR','OPERADOR'))
);

COMMENT ON TABLE  ET_USUARIOS            IS 'Usuarios do sistema de gestao de estoque trade';
COMMENT ON COLUMN ET_USUARIOS.PERFIL     IS 'ADMINISTRADOR: acesso total | GESTOR: aprova pedidos | OPERADOR: consulta e solicita';
COMMENT ON COLUMN ET_USUARIOS.SENHA_HASH IS 'SHA-256 + salt — nunca armazenar senha em texto claro';
/

-- ─────────────────────────────────────────────
-- 3. ET_CATEGORIAS
--    Tipos de material de PDV (Banner, Totem, Display…)
--    Apenas as categorias ativas no sistema são migradas
-- ─────────────────────────────────────────────
CREATE TABLE ET_CATEGORIAS (
    ID          VARCHAR2(36)   NOT NULL,
    NOME        VARCHAR2(255)  NOT NULL,
    IMAGEM_URL  VARCHAR2(1000),
    DT_CRIACAO  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_CAT      PRIMARY KEY (ID),
    CONSTRAINT UQ_ET_CAT_NOME UNIQUE      (NOME)
);

COMMENT ON TABLE  ET_CATEGORIAS          IS 'Categorias de materiais de trade PDV (apenas categorias ativas migradas)';
COMMENT ON COLUMN ET_CATEGORIAS.NOME     IS 'Ex: Banner, Totem, Display, Wobbler, Brinde…';
/

-- ─────────────────────────────────────────────
-- 4. ET_LOCALIZACOES
--    Endereçamento físico do estoque: rua / prédio / andar / apartamento
-- ─────────────────────────────────────────────
CREATE TABLE ET_LOCALIZACOES (
    ID          VARCHAR2(36)  NOT NULL,
    RUA         VARCHAR2(100) NOT NULL,
    PREDIO      VARCHAR2(100) NOT NULL,
    ANDAR       VARCHAR2(100) NOT NULL,
    APARTAMENTO VARCHAR2(100) NOT NULL,
    DT_CRIACAO  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_LOC PRIMARY KEY (ID)
);

COMMENT ON TABLE  ET_LOCALIZACOES             IS 'Enderecos fisicos do deposito de trade (rua/predio/andar/apto)';
COMMENT ON COLUMN ET_LOCALIZACOES.RUA         IS 'Corredor / rua interna do deposito';
COMMENT ON COLUMN ET_LOCALIZACOES.APARTAMENTO IS 'Unidade (prateleira, caixa, gaveta)';
/

-- ─────────────────────────────────────────────
-- 5. ET_MARCADORES
--    Etiquetas dinâmicas com cor para solicitações
-- ─────────────────────────────────────────────
CREATE TABLE ET_MARCADORES (
    ID          VARCHAR2(36)  NOT NULL,
    NOME        VARCHAR2(255) NOT NULL,
    COR         VARCHAR2(20)  DEFAULT '#6366f1' NOT NULL,
    DT_CRIACAO  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_MAR      PRIMARY KEY (ID),
    CONSTRAINT UQ_ET_MAR_NOME UNIQUE      (NOME)
);

COMMENT ON TABLE  ET_MARCADORES     IS 'Etiquetas dinamicas para solicitacoes (ex: Acao de Trade, Brinde Normal)';
COMMENT ON COLUMN ET_MARCADORES.COR IS 'Cor hexadecimal para exibicao no sistema (#rrggbb)';
/

-- ─────────────────────────────────────────────
-- 6. ET_MATERIAIS
--    Item de estoque (produto/material de PDV)
--    FK: ET_CATEGORIAS, ET_LOCALIZACOES
-- ─────────────────────────────────────────────
CREATE TABLE ET_MATERIAIS (
    ID                  VARCHAR2(36)   NOT NULL,
    NOME                VARCHAR2(500)  NOT NULL,
    SKU                 VARCHAR2(255),
    CATEGORIA_ID        VARCHAR2(36)   NOT NULL,
    QUANTIDADE          NUMBER(10,0)   DEFAULT 0 NOT NULL,
    CUSTO_UNITARIO      NUMBER(15,4),
    DT_ENTRADA          TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    STATUS              VARCHAR2(20)   DEFAULT 'DISPONIVEL' NOT NULL,
    FORNECEDOR          VARCHAR2(500),
    NOME_ACAO           VARCHAR2(500),
    PERIODO_ACAO_INICIO TIMESTAMP,
    PERIODO_ACAO_FIM    TIMESTAMP,
    DATA_VALIDADE       TIMESTAMP,
    FOTO_URL            VARCHAR2(1000),
    LOCALIZACAO_ID      VARCHAR2(36),
    DT_CRIACAO          TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    DT_ATUALIZACAO      TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_MAT        PRIMARY KEY (ID),
    CONSTRAINT UQ_ET_MAT_SKU    UNIQUE      (SKU),
    CONSTRAINT FK_ET_MAT_CAT    FOREIGN KEY (CATEGORIA_ID)
        REFERENCES ET_CATEGORIAS(ID),
    CONSTRAINT FK_ET_MAT_LOC    FOREIGN KEY (LOCALIZACAO_ID)
        REFERENCES ET_LOCALIZACOES(ID)
        ON DELETE SET NULL,
    CONSTRAINT CK_ET_MAT_STATUS CHECK (STATUS IN ('DISPONIVEL','RESERVADO','ESGOTADO')),
    CONSTRAINT CK_ET_MAT_QTD    CHECK (QUANTIDADE >= 0)
);

COMMENT ON TABLE  ET_MATERIAIS                   IS 'Materiais de trade PDV armazenados no estoque';
COMMENT ON COLUMN ET_MATERIAIS.STATUS            IS 'DISPONIVEL: em estoque | RESERVADO: em uso | ESGOTADO: sem saldo';
COMMENT ON COLUMN ET_MATERIAIS.SKU               IS 'Codigo interno unico do item (opcional)';
COMMENT ON COLUMN ET_MATERIAIS.PERIODO_ACAO_INICIO IS 'Data de inicio da campanha/acao vinculada ao material';
COMMENT ON COLUMN ET_MATERIAIS.DATA_VALIDADE     IS 'Data de validade fisica do material (controle de descarte)';
/

CREATE INDEX IDX_ET_MAT_CAT ON ET_MATERIAIS(CATEGORIA_ID);
CREATE INDEX IDX_ET_MAT_LOC ON ET_MATERIAIS(LOCALIZACAO_ID);
CREATE INDEX IDX_ET_MAT_STS ON ET_MATERIAIS(STATUS);
CREATE INDEX IDX_ET_MAT_VAL ON ET_MATERIAIS(DATA_VALIDADE);
/

-- ─────────────────────────────────────────────
-- 7. ET_MOVIMENTACOES
--    Histórico de entradas e saídas do estoque
--    FK: ET_MATERIAIS, ET_USUARIOS
-- ─────────────────────────────────────────────
CREATE TABLE ET_MOVIMENTACOES (
    ID          VARCHAR2(36)   NOT NULL,
    TIPO        VARCHAR2(10)   NOT NULL,
    QUANTIDADE  NUMBER(10,0)   NOT NULL,
    MATERIAL_ID VARCHAR2(36)   NOT NULL,
    USUARIO_ID  VARCHAR2(36)   NOT NULL,
    OBSERVACOES VARCHAR2(4000),
    DT_CRIACAO  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_MOV      PRIMARY KEY (ID),
    CONSTRAINT FK_ET_MOV_MAT  FOREIGN KEY (MATERIAL_ID)
        REFERENCES ET_MATERIAIS(ID),
    CONSTRAINT FK_ET_MOV_USR  FOREIGN KEY (USUARIO_ID)
        REFERENCES ET_USUARIOS(ID),
    CONSTRAINT CK_ET_MOV_TIPO CHECK (TIPO IN ('ENTRADA','SAIDA')),
    CONSTRAINT CK_ET_MOV_QTD  CHECK (QUANTIDADE > 0)
);

COMMENT ON TABLE  ET_MOVIMENTACOES         IS 'Historico completo de entradas e saidas de cada material';
COMMENT ON COLUMN ET_MOVIMENTACOES.TIPO    IS 'ENTRADA: reposicao de estoque | SAIDA: consumo/distribuicao';
/

CREATE INDEX IDX_ET_MOV_MAT  ON ET_MOVIMENTACOES(MATERIAL_ID);
CREATE INDEX IDX_ET_MOV_USR  ON ET_MOVIMENTACOES(USUARIO_ID);
CREATE INDEX IDX_ET_MOV_TIPO ON ET_MOVIMENTACOES(TIPO);
CREATE INDEX IDX_ET_MOV_DT   ON ET_MOVIMENTACOES(DT_CRIACAO);
/

-- ─────────────────────────────────────────────
-- 8. ET_DOCUMENTOS
--    Comprovante de saída — asssinatura física ou upload
--    Relação 1:1 com ET_MOVIMENTACOES
-- ─────────────────────────────────────────────
CREATE TABLE ET_DOCUMENTOS (
    ID              VARCHAR2(36)   NOT NULL,
    MOVIMENTACAO_ID VARCHAR2(36)   NOT NULL,
    DT_ASSINATURA   TIMESTAMP,
    ASSINADO_POR    VARCHAR2(255),
    STATUS          VARCHAR2(20)   DEFAULT 'AGUARDANDO' NOT NULL,
    URL_ARQUIVO     VARCHAR2(1000),
    URL_DOC_ASSIN   VARCHAR2(1000),
    OBSERVACOES     VARCHAR2(4000),
    DT_CRIACAO      TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    DT_ATUALIZACAO  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_DOC        PRIMARY KEY (ID),
    CONSTRAINT UQ_ET_DOC_MOV    UNIQUE      (MOVIMENTACAO_ID),
    CONSTRAINT FK_ET_DOC_MOV    FOREIGN KEY (MOVIMENTACAO_ID)
        REFERENCES ET_MOVIMENTACOES(ID),
    CONSTRAINT CK_ET_DOC_STATUS CHECK (STATUS IN ('AGUARDANDO','ASSINADO','CANCELADO'))
);

COMMENT ON TABLE  ET_DOCUMENTOS                IS 'Comprovantes e assinaturas vinculados a movimentacoes de saida';
COMMENT ON COLUMN ET_DOCUMENTOS.URL_DOC_ASSIN  IS 'URL da foto/scan do documento assinado manualmente';
/

CREATE INDEX IDX_ET_DOC_STS ON ET_DOCUMENTOS(STATUS);
/

-- ─────────────────────────────────────────────
-- 9. ET_SOLICITACOES
--    Pedido de saída criado por qualquer usuário
--    Aprovação: somente ADMINISTRADOR ou GESTOR
--    Quando aprovada → gera uma ET_MOVIMENTACOES (SAIDA)
--    FK: ET_MATERIAIS, ET_USUARIOS(×2), ET_MARCADORES
-- ─────────────────────────────────────────────
CREATE TABLE ET_SOLICITACOES (
    ID              VARCHAR2(36)   NOT NULL,
    MATERIAL_ID     VARCHAR2(36)   NOT NULL,
    SOLICITANTE_ID  VARCHAR2(36)   NOT NULL,
    QUANTIDADE      NUMBER(10,0)   NOT NULL,
    JUSTIFICATIVA   VARCHAR2(4000) NOT NULL,
    STATUS          VARCHAR2(20)   DEFAULT 'PENDENTE' NOT NULL,
    APROVADOR_ID    VARCHAR2(36),
    DT_APROVACAO    TIMESTAMP,
    MOVIMENTACAO_ID VARCHAR2(36),
    URL_DOC_ASSIN   VARCHAR2(1000),
    OBSERVACOES     VARCHAR2(4000),
    MARCADOR_ID     VARCHAR2(36),
    DT_CRIACAO      TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    DT_ATUALIZACAO  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    --
    CONSTRAINT PK_ET_SOL      PRIMARY KEY (ID),
    CONSTRAINT FK_ET_SOL_MAT  FOREIGN KEY (MATERIAL_ID)
        REFERENCES ET_MATERIAIS(ID),
    CONSTRAINT FK_ET_SOL_SOL  FOREIGN KEY (SOLICITANTE_ID)
        REFERENCES ET_USUARIOS(ID),
    CONSTRAINT FK_ET_SOL_APR  FOREIGN KEY (APROVADOR_ID)
        REFERENCES ET_USUARIOS(ID),
    CONSTRAINT FK_ET_SOL_MAR  FOREIGN KEY (MARCADOR_ID)
        REFERENCES ET_MARCADORES(ID)
        ON DELETE SET NULL,
    CONSTRAINT CK_ET_SOL_STS  CHECK (STATUS IN ('PENDENTE','APROVADA','REJEITADA')),
    CONSTRAINT CK_ET_SOL_QTD  CHECK (QUANTIDADE > 0)
);

COMMENT ON TABLE  ET_SOLICITACOES                  IS 'Pedidos de saida de materiais — fluxo de aprovacao obrigatorio';
COMMENT ON COLUMN ET_SOLICITACOES.STATUS           IS 'PENDENTE: aguarda aprovacao | APROVADA: gera movimentacao | REJEITADA: negada';
COMMENT ON COLUMN ET_SOLICITACOES.MOVIMENTACAO_ID  IS 'Preenchido automaticamente quando a solicitacao e aprovada';
/

CREATE INDEX IDX_ET_SOL_MAT ON ET_SOLICITACOES(MATERIAL_ID);
CREATE INDEX IDX_ET_SOL_SOL ON ET_SOLICITACOES(SOLICITANTE_ID);
CREATE INDEX IDX_ET_SOL_STS ON ET_SOLICITACOES(STATUS);
CREATE INDEX IDX_ET_SOL_MAR ON ET_SOLICITACOES(MARCADOR_ID);
CREATE INDEX IDX_ET_SOL_DT  ON ET_SOLICITACOES(DT_CRIACAO);
/

-- ============================================================
-- FIM DO DDL — Execute migrate-to-oracle.js para popular dados
-- ============================================================
