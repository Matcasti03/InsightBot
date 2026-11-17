import { Router } from 'express';
import localAuthRouter from './localAuth.js';
import meRouter from './me.js';
import dashboardRouter from './dashboard.js';
import patientsRouter from './patients.js';
import examsRouter from './exams.js';
import biopsiesRouter from './biopsies.js';
import adminRouter from './admin.js';
import healthUnitsRouter from './healthUnits.js';

const router = Router();

router.use('/auth', localAuthRouter);
router.use('/me', meRouter);
router.use('/dashboard', dashboardRouter);
router.use('/patients', patientsRouter);
router.use('/exams', examsRouter);
router.use('/biopsies', biopsiesRouter);
router.use('/admin', adminRouter);
router.use('/health-units', healthUnitsRouter);

export default router;
