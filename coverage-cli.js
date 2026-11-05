#!/usr/bin/env node
'use strict';

// Punto de entrada estable solicitado como entregable: `coverage-cli`.
// La implementación modular vive en tools/coverage/.
require('./tools/coverage/bin/coverage-cli').runFromProcess();
