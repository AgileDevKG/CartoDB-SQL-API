/**
 *
 * Requires the database and tables setup in config/environments/test.js to exist
 * Ensure the user is present in the pgbouncer auth file too
 * TODO: Add OAuth tests.
 *
 * To run this test, ensure that cartodb_test_user_1_db metadata exists in Redis for the vizziality.cartodb.com domain
 *
 * SELECT 5
 * HSET rails:users:vizzuality id 1
 * HSET rails:users:vizzuality database_name cartodb_dev_user_1_db
 *
 */
require('../helper');
require('../support/assert');

var app    = require(global.settings.app_root + '/app/controllers/app')
    , assert = require('assert')
    , tests  = module.exports = {}
    , querystring = require('querystring');

// allow lots of emitters to be set to silence warning
app.setMaxListeners(0);

suite('app.test', function() {

var real_oauth_header = 'OAuth realm="http://vizzuality.testhost.lan/",oauth_consumer_key="fZeNGv5iYayvItgDYHUbot1Ukb5rVyX6QAg8GaY2",oauth_token="l0lPbtP68ao8NfStCiA3V3neqfM03JKhToxhUQTR",oauth_signature_method="HMAC-SHA1", oauth_signature="o4hx4hWP6KtLyFwggnYB4yPK8xI%3D",oauth_timestamp="1313581372",oauth_nonce="W0zUmvyC4eVL8cBd4YwlH1nnPTbxW0QBYcWkXTwe4",oauth_version="1.0"';

// use dec_sep for internationalization
var checkDecimals = function(x, dec_sep){
    var tmp='' + x;
    if (tmp.indexOf(dec_sep)>-1)
        return tmp.length-tmp.indexOf(dec_sep)-1;
    else
        return 0;
}

test('GET /api/v1/sql', function(done){
    assert.response(app, {
        url: '/api/v1/sql',
        method: 'GET'
    },{
        status: 400
    }, function(res) {
        assert.deepEqual(JSON.parse(res.body), {"error":["You must indicate a sql query"]});
        done();
    });
});


test('GET /api/v1/sql with SQL parameter on SELECT only. No oAuth included ', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4&database=cartodb_test_user_1_db',
        method: 'GET'
    },{ }, function(res) {
        assert.equal(res.statusCode, 200, res.body);
        done();
    });
});


test('GET /api/v1/sql with SQL parameter on SELECT only. no database param, just id using headers', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res) {
        assert.equal(res.statusCode, 200, res.body);
        done();
    });
});


test('POST /api/v1/sql with SQL parameter on SELECT only. no database param, just id using headers', function(done){
    assert.response(app, {
        url: '/api/v1/sql',
        data: querystring.stringify({q: "SELECT * FROM untitle_table_4"}),
        headers: {host: 'vizzuality.cartodb.com', 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST'
    },{ }, function(res) {
        assert.equal(res.statusCode, 200, res.body);
        done();
    });
});

test('GET /api/v1/sql with SQL parameter on INSERT only. oAuth not used, so public user - should fail', function(){
    assert.response(app, {
        url: "/api/v1/sql?q=INSERT%20INTO%20untitle_table_4%20(id)%20VALUES%20(1)&database=cartodb_dev_user_1_db",
        method: 'GET'
    },{
        status: 400
    });
});

test('GET /api/v1/sql with SQL parameter on DROP DATABASE only. oAuth not used, so public user - should fail', function(){
    assert.response(app, {
        url: "/api/v1/sql?q=DROP%20TABLE%20untitle_table_4&database=cartodb_dev_user_1_db",
        method: 'GET'
    },{
        status: 400
    });
});

test('GET /api/v1/sql with SQL parameter on INSERT only. header based db - should fail', function(){
    assert.response(app, {
        url: "/api/v1/sql?q=INSERT%20INTO%20untitle_table_4%20(id)%20VALUES%20(1)",
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{
        status: 400
    });
});

test('GET /api/v1/sql with SQL parameter on DROP DATABASE only.header based db - should fail', function(){
    assert.response(app, {
        url: "/api/v1/sql?q=DROP%20TABLE%20untitle_table_4",
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{
        status: 400
    });
});

test('GET /api/v1/sql with SQL parameter and geojson format, ensuring content-disposition set to geojson', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4&format=geojson',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /filename=cartodb-query.geojson/gi.test(cd));
        done();
    });
});

test('GET /api/v1/sql with SQL parameter and no format, ensuring content-disposition set to json', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /filename=cartodb-query.json/gi.test(cd));
        done();
    });
});

test('GET /api/v1/sql ensure cross domain set on errors', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*gadfgadfg%20FROM%20untitle_table_4',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{
        status: 400
    }, function(res){
        var cd = res.header('Access-Control-Allow-Origin');
        assert.equal(cd, '*');
        done();
    });
});

test('GET /api/v1/sql as geojson limiting decimal places', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4&format=geojson&dp=1',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var result = JSON.parse(res.body);
        assert.equal(1, checkDecimals(result.features[0].geometry.coordinates[0], '.'));
        done();
    });
});

test('GET /api/v1/sql as geojson with default dp as 6', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4&format=geojson',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var result = JSON.parse(res.body);
        assert.equal(6, checkDecimals(result.features[0].geometry.coordinates[0], '.'));
        done();
    });
});

test('GET /api/v1/sql as geojson with missing geometry column', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20cartodb_id%20FROM%20untitle_table_4&format=geojson',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 400, res.body);
        var result = JSON.parse(res.body);
        assert.deepEqual(result, {error: ['column "the_geom" does not exist']} );
        done();
    });
});

test('GET /api/v1/sql as geojson with missing custom geometry column', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20the_geom%20as%20the_geom%20FROM%20untitle_table_4&format=geojson&gn=mygeom',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 400, res.body);
        var result = JSON.parse(res.body);
        assert.deepEqual(result, {error: ['column "mygeom" does not exist']} );
        done();
    });
});

test('GET /api/v1/sql as geojson with custom geometry column', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20the_geom%20as%20mygeom%20FROM%20untitle_table_4&format=geojson&gn=mygeom',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var result = JSON.parse(res.body);
        assert.equal(-370, Math.round(result.features[0].geometry.coordinates[0]*100));
        assert.equal(4042, Math.round(result.features[0].geometry.coordinates[1]*100));
        done();
    });
});

test('GET /api/v1/sql as csv', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20cartodb_id,ST_AsEWKT(the_geom)%20as%20geom%20FROM%20untitle_table_4%20LIMIT%201&format=csv',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var body = "cartodb_id,geom\r\n1,SRID=4326;POINT(-3.699732 40.423012)";
        assert.equal(body, res.body);
        done();
    });
});

test('GET /api/v1/sql as csv, properly escaped', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20cartodb_id,%20address%20FROM%20untitle_table_4%20LIMIT%201&format=csv',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var body = 'cartodb_id,address\r\n1,"Calle de Pérez Galdós 9, Madrid, Spain"';
        assert.equal(body, res.body);
        done();
    });
});

test('cannot GET system tables', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20pg_attribute',
        headers: {host: 'vizzuality.cartodb.com'},
        method: 'GET'
    },{
        status: 403
    }, function() { done(); });
});

test('GET decent error if domain is incorrect', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4&format=geojson',
        headers: {host: 'vizzualinot.cartodb.com'},
        method: 'GET'
    },{
        status: 404
    }, function(res){
        var result = JSON.parse(res.body);
        assert.equal(result.error[0],"Sorry, we can't find this CartoDB. Please check that you have entered the correct domain.");
        done();
    });
});

});
