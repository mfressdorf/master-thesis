import chai from 'chai';
import delayedQueueLib from '../lib/delayedQueueAmqp';
import amqp from 'amqplib';

const expect = chai.expect;
const config = {
  url: 'amqp://guest:guest@localhost:5672',
  ack: true
};
const delayedQueue = delayedQueueLib(config);

function cleanUpRabbitMQ(done) {
  amqp
    .connect(config.url)
    .then(conn => {
      conn
        .createChannel()
        .then(ch => {
          return Promise.all([
            ch.deleteQueue('transactionCheck1'),
            ch.deleteQueue('transactionCheck2'),
            ch.deleteExchange('transactionChecks')
          ]);
        })
        .then(() => {
          done();
        })
    });
}

before(done => cleanUpRabbitMQ(done));

describe('The delayed queue', () => {

  it('should create a consumer', done => {
    // Set up consumer
    delayedQueue.consume('transactionCheck1', msg => {})
      .then(() => {
        // Check if consumer exists
        amqp
          .connect(config.url)
          .then(conn => {
            conn
              .createChannel()
              .then(ch => {
                ch.checkQueue('transactionCheck1')
                  .then(res => {
                    done();
                  });
              });
          });
      });
  });

  it('should send a delayed message', done => {
    delayedQueue.consume('transactionCheck2', msg => {
      let parsedMsg = msg.content.toString();
      expect(msg).to.be.defined;
      expect(msg.properties.headers).to.be.defined;
      expect(msg.properties.headers['x-delay']).to.be.equal(500);
      expect(parsedMsg).to.be.a('string');
      expect(parsedMsg).to.have.string('transactionId1');
      done();
    })
    // listen for transaction outcome on listener 'api2'
    .then(res => {
      delayedQueue.send('transactionCheck2', 'transactionId1', 500);
    });
  });
});
