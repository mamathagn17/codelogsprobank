const express = require("express");
const router = express.Router();
const sql = require("mssql");
const config = require("../config/db");

router.post("/AnnualList", async (req, res) => {
    try {
        const { currentPage, perPage, month, branch_id, client_id,year } = req.body;
       // console.log(currentPage, perPage,  branch_id, client_id,year )

        let SQLwhereClause = `WHERE 1=1`;
        const params = {};
        if (branch_id) {
            SQLwhereClause += ` AND branch_id = @branch_id`;
            params.branch_id = branch_id;
        }
        if (client_id) {
            SQLwhereClause += ` AND client_id = @client_id`;
            params.client_id = client_id;
        }
        if (year) {
            SQLwhereClause += ` AND year = @year`;
            params.year =year;
        }
        
        const query = `
            SELECT Temp.*,
                C.client_name,
                B.branch_name,
                U.user_name
            FROM (
                SELECT 
                    *, 
                    ROW_NUMBER() OVER (ORDER BY client_id) AS RowNum
                FROM tb_annualreconciliation
                ${SQLwhereClause}
            ) AS Temp
            LEFT JOIN tb_clientmaster C ON Temp.client_id = C.client_id
            LEFT JOIN tb_branch B ON Temp.branch_id = B.branch_id
            LEFT JOIN tb_users U ON Temp.actionedby = U.user_id
            WHERE RowNum > ${(currentPage - 1) * perPage} AND RowNum <= ${currentPage * perPage}
            ORDER BY client_id`;

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('month', sql.VarChar, params.month)
            .input('branch_id', sql.VarChar, params.branch_id)
            .input('client_id',sql.VarChar,params.client_id)
            .input('year',sql.VarChar,params.year)
            .query(query);

        const resultSet = result.recordset;

        const response = {
            message: "Annual reconciliation fetched successfully",
            Valid: true,
            ResultSet: resultSet
        };

        res.status(200).json(response);
    } catch (err) {
        console.error("Error:", err);
        const response = {
            message: "Annual reconciliation not fetched",
            Valid: false,
        };
        res.status(500).json(response); // Internal server error
    }
});

router.post("/GetPendingList", async (req, res) => {
    try {
        const { currentPage, perPage,  branch_id, client_id ,year} = req.body;
       // console.log(currentPage, perPage,  branch_id, client_id,year )

        let SQLwhereClause = `WHERE 1=1 AND pending_status = 1`; // Added condition for pending_status
        const params = {};

        if (year) {
            SQLwhereClause += ` AND [year] = @year`;
            params.year = year;
        }

        if (branch_id) {
            SQLwhereClause += ` AND branch_id = @branch_id`;
            params.branch_id = branch_id;
        }
        if (client_id) {
            SQLwhereClause += ` AND client_id = @client_id`;
            params.client_id = client_id;
        }
        
        const query = `
            SELECT Temp.*,
                C.client_name,
                B.branch_name,
                U.user_name
            FROM (
                SELECT 
                    *, 
                    ROW_NUMBER() OVER (ORDER BY client_id) AS RowNum
                FROM tb_annualreconciliation
                ${SQLwhereClause}
            ) AS Temp
            LEFT JOIN tb_clientmaster C ON Temp.client_id = C.client_id
            LEFT JOIN tb_branch B ON Temp.branch_id = B.branch_id
            LEFT JOIN tb_users U ON Temp.actionedby = U.user_id
            WHERE RowNum > ${(currentPage - 1) * perPage} AND RowNum <= ${currentPage * perPage}
            ORDER BY client_id`;

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('month', sql.VarChar, params.month)
            .input('branch_id', sql.VarChar, params.branch_id)
            .input('client_id',sql.VarChar,params.client_id)
            .input('year',sql.VarChar,params.year)
            .query(query);

        const resultSet = result.recordset;

        const response = {
            message: "Annual reconciliation fetched successfully",
            Valid: true,
            ResultSet: resultSet
        };

        res.status(200).json(response);
    } catch (err) {
        console.error("Error:", err);
        const response = {
            message: "Annual reconciliation not fetched",
            Valid: false,
        };
        res.status(500).json(response); // Internal server error
    }
});





router.post("/UpdateField", async (req, res) => {
    try {
        const { requestId,year,fieldName, updatedValue } = req.body;

        let query;
        switch (fieldName) {
            case 'amount':
          
                query = `UPDATE tb_annualreconciliation SET ${fieldName} = @updatedValue WHERE client_id = @requestId  AND year=@year`;
                break;
            case 'remarks':
                query = `UPDATE tb_annualreconciliation SET remarks = @updatedValue WHERE client_id = @requestId AND year=@year`;
                break;
            default:
                return res.status(400).json({ message: "Invalid field name" });
        }

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('requestId', sql.Int, requestId)
            .input('year', sql.Int, year)
            .input('updatedValue', sql.VarChar, updatedValue)
            .query(query);

        res.status(200).json({ Success: true });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Error updating field" });
    }
});

router.post("/MarkAsPending", async (req, res) => {
    try {
        const { requests } = req.body; // Expecting an array of { client_id,year }

        if (!requests || requests.length === 0) {
            return res.status(400).json({ message: "No requests provided" });
        }

        // Construct WHERE clause with multiple AND conditions combined with OR
        const conditions = requests.map(({ client_id, month, year }) => 
            `(client_id = '${client_id}'  AND year = '${year}')`
        ).join(' OR ');
        const query = `UPDATE tb_annualreconciliation SET pending_status = 1  WHERE ${conditions}`;

        const pool = await sql.connect(config);
        await pool.request().query(query);

        res.status(200).json({ Success: true });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Error marking records as pending" });
    }
});
router.post("/MarkAsCompleted", async (req, res) => {
    try {
        const { requests } = req.body; // Expecting an array of { client_id,year }

        if (!requests || requests.length === 0) {
            return res.status(400).json({ message: "No requests provided" });
        }

        // Construct WHERE clause with multiple AND conditions combined with OR
        const conditions = requests.map(({ client_id, month, year }) => 
            `(client_id = '${client_id}'  AND year = '${year}')`
        ).join(' OR ');
        const query = `UPDATE tb_annualreconciliation SET pending_status = 2 WHERE ${conditions}`;

        const pool = await sql.connect(config);
        await pool.request().query(query);

        res.status(200).json({ Success: true });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Error marking records as pending" });
    }
});


router.post('/LogAnnualAction', async (req, res) => {
    
    const { userInfo, recIds, action } = req.body;
  
    console.log(userInfo);

  
  const { user_id, user_name } = userInfo;
  const date_time = new Date();
  
    try {
     
      const pool = await sql.connect(config);
  
      for (const recId of recIds) {
       
        const query = `
            INSERT INTO tb_annualreconciliationlogs (user_id, user_name, recid, date_time, action)
            VALUES (@user_id, @user_name, @recid, GETDATE(), @action)
        `;

        await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('user_name', sql.VarChar, user_name)
            .input('recid', sql.Int, recId)
            .input('date_time', sql.DateTime,date_time)
            .input('action', sql.VarChar, action)
            .query(query);
    }
  
     
      res.json({ success: true, message: 'Annual Reconciliation Action Pending Successfull.' });
    } catch (error) {
      
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    } finally {
     
      await sql.close();
    }
  });



  


router.post("/annualreconciliationlogs", async (req, res) => {
    try {
      var pool = await sql.connect(config); 
      console.log(req.body);
      console.log("Connected to SQL Server");
  
      
      var { currentPage, perPage } = req.body;
  
     
      const totalCountQuery =`SELECT COUNT(*) AS TotalCount FROM tb_annualreconciliationlogs`;
      console.log("Total Count Query:", totalCountQuery);
      const resultTotalCount = await pool.request().query(totalCountQuery);
      const totalCount = resultTotalCount.recordset[0].TotalCount;
      console.log("Total Count:", totalCount);
  
      const query = `SELECT *
      FROM (
          SELECT *, ROW_NUMBER() OVER (ORDER BY date_time DESC) AS RowNum
          FROM tb_annualreconciliationlogs
      ) AS UserWithRowNum
      WHERE RowNum BETWEEN ${(currentPage - 1) * perPage + 1} AND ${currentPage * perPage}
      ORDER BY date_time DESC;
      `;
  
     
  
      const result = await pool.request().query(query);
      const resultSet = result.recordset;
      console.log("Result Set:", resultSet);
  
      const response = {
        message: "Annual Reconciliation logs list fetched successfully",
        Valid: true,
        TotalCount: totalCount,
        ResultSet: resultSet
      };
  
      res.status(200).json(response);
    } catch (err) {
      console.error("Error:", err);
      const response = {
        message: " request list not fetched",
        Valid: false,
      };
      res.status(500).json(response);
    }
  });
  

  const fs = require('fs');
  router.get('/downloadannualLogs', async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const path = require('path');
  
      const result = await pool.request().query('SELECT * FROM tb_annualreconciliationlogs');
      const annualLogs = result.recordset;
      const csvData = annualLogs.map(log => Object.values(log).join(','));
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const tempFilePath = path.join(tempDir, 'annual_logs.csv');
      fs.writeFileSync(tempFilePath, csvData.join('\n'));
  
      res.download(tempFilePath, 'annual.csv', () => {
        fs.unlinkSync(tempFilePath);
      });
    } catch (error) {
      console.error('Error fetching Annual logs:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    } finally {
      await sql.close();
    }
  });
  router.get('/downloadAnnualReco', async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const path = require('path');
  
      const result = await pool.request().query('SELECT * FROM tb_annualreconciliation');
      const annualLogs = result.recordset;
      const csvData = annualLogs.map(log => Object.values(log).join(','));
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const tempFilePath = path.join(tempDir, 'annualreconciliation_logs.csv');
      fs.writeFileSync(tempFilePath, csvData.join('\n'));
  
      res.download(tempFilePath, 'annualrecon.csv', () => {
        fs.unlinkSync(tempFilePath);
      });
    } catch (error) {
      console.error('Error fetching Annual Reconciliation:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    } finally {
      await sql.close();
    }
  });


module.exports = router;